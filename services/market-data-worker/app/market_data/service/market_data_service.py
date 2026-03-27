import logging
from dataclasses import asdict
from datetime import date, timedelta
from typing import Iterable, List, Optional, Sequence

from app.market_data.provider.base import MarketDataProvider
from app.market_data.repository import prices as prices_repo
from app.market_data.repository import tickers as tickers_repo
from app.market_data.types import PricePoint


logger = logging.getLogger("market-data")

REFERENCE_TICKERS = ["^GSPC", "^IXIC", "GC=F", "^TNX"]


def fetch_and_store_prices_for_tickers(
    conn,
    provider: MarketDataProvider | Sequence[MarketDataProvider],
    tickers: Iterable[str],
    end_date: Optional[date] = None,
    years: int = 2,
    days: Optional[int] = None,
) -> dict:
    end_date = end_date or date.today()
    if days is not None:
        start_date = end_date - timedelta(days=days)
    else:
        start_date = end_date - timedelta(days=365 * years)

    total_inserted = 0
    total_requested = 0
    failures = 0

    providers = _ensure_providers(provider)

    for ticker in _normalize_tickers(tickers):
        total_requested += 1
        success = False
        last_error: Optional[Exception] = None

        for current_provider in providers:
            try:
                metadata = current_provider.fetch_metadata(ticker)
                points: List[PricePoint] = current_provider.fetch_daily_prices(
                    ticker,
                    start_date,
                    end_date,
                    metadata=metadata,
                )
                if not points:
                    logger.info(
                        "prices_empty",
                        extra={"ticker": ticker, "provider": current_provider.name},
                    )
                    continue
                with conn.cursor() as cur:
                    prices_repo.ensure_table(cur)
                    inserted = prices_repo.upsert_prices(cur, points)
                    total_inserted += inserted
                conn.commit()
                logger.info(
                    "prices_ingested",
                    extra={
                        "ticker": ticker,
                        "provider": current_provider.name,
                        "count": len(points),
                        "inserted": inserted,
                        "start_date": start_date.isoformat(),
                        "end_date": end_date.isoformat(),
                        "metadata": asdict(metadata) if metadata else None,
                    },
                )
                success = True
                break
            except Exception as exc:
                last_error = exc
                logger.warning(
                    "prices_provider_failed",
                    extra={"ticker": ticker, "provider": current_provider.name, "error": str(exc)},
                )

        if not success:
            failures += 1
            logger.exception(
                "prices_failed",
                extra={"ticker": ticker, "error": str(last_error) if last_error else "unknown"},
            )
            continue

    return {
        "tickers_requested": total_requested,
        "rows_inserted": total_inserted,
        "failures": failures,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
    }


def fetch_tickers_from_activities(conn) -> List[str]:
    with conn.cursor() as cur:
        return tickers_repo.fetch_distinct_tickers(cur)


def build_default_tickers(conn) -> List[str]:
    activity_tickers = fetch_tickers_from_activities(conn)
    merged = activity_tickers + REFERENCE_TICKERS
    return _normalize_tickers(merged)


def _normalize_tickers(tickers: Iterable[str]) -> List[str]:
    cleaned = []
    seen = set()
    for ticker in tickers:
        if ticker is None:
            continue
        value = str(ticker).strip()
        if not value:
            continue
        if value in seen:
            continue
        seen.add(value)
        cleaned.append(value)
    return cleaned


def _ensure_providers(
    provider: MarketDataProvider | Sequence[MarketDataProvider],
) -> List[MarketDataProvider]:
    if isinstance(provider, Sequence):
        return list(provider)
    return [provider]
