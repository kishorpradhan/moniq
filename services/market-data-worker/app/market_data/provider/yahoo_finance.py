import json
import logging
import time
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import List, Optional
from urllib.parse import urlencode

import requests

from app.market_data.provider.base import MarketDataProvider
from app.market_data.types import MarketMetadata, PricePoint


logger = logging.getLogger("market-data")


class YahooFinanceProvider(MarketDataProvider):
    name = "yahoo_finance"

    _chart_base = "https://query1.finance.yahoo.com/v8/finance/chart/"
    _summary_base = "https://query2.finance.yahoo.com/v10/finance/quoteSummary/"

    def __init__(self, timeout_seconds: int = 10, max_retries: int = 3):
        self.timeout_seconds = timeout_seconds
        self.max_retries = max_retries

    def fetch_daily_prices(
        self,
        ticker: str,
        start_date: date,
        end_date: date,
        metadata: Optional[MarketMetadata] = None,
    ) -> List[PricePoint]:
        params = {
            "interval": "1d",
            "period1": _to_epoch(start_date),
            "period2": _to_epoch(end_date),
            "events": "div,splits",
            "includePrePost": "false",
        }
        url = f"{self._chart_base}{ticker}?{urlencode(params)}"
        payload = self._get_json(url)
        if not payload:
            return []

        chart = payload.get("chart", {})
        error = chart.get("error")
        if error:
            logger.warning("yahoo_chart_error", extra={"ticker": ticker, "error": error})
            return []

        result = (chart.get("result") or [None])[0]
        if not result:
            return []

        timestamps = result.get("timestamp") or []
        indicators = (result.get("indicators") or {}).get("quote") or []
        closes = indicators[0].get("close") if indicators else []
        if not timestamps or not closes:
            return []

        meta = metadata or self.fetch_metadata(ticker)
        points: List[PricePoint] = []
        for ts, close in zip(timestamps, closes):
            if close is None:
                continue
            price_date = datetime.fromtimestamp(ts, tz=timezone.utc).date()
            close_price = _to_decimal(close)
            if close_price is None:
                continue
            points.append(
                PricePoint(
                    ticker=ticker,
                    price_date=price_date,
                    close_price=close_price,
                    source=self.name,
                    pe_ratio=meta.pe_ratio if meta else None,
                    marketcap=meta.marketcap if meta else None,
                    industry=meta.industry if meta else None,
                    sector=meta.sector if meta else None,
                    indices=meta.indices if meta else None,
                )
            )
        return points

    def fetch_metadata(self, ticker: str) -> Optional[MarketMetadata]:
        indices_hint = _indices_hint(ticker)
        params = {"modules": "price,summaryDetail,assetProfile"}
        url = f"{self._summary_base}{ticker}?{urlencode(params)}"
        payload = self._get_json(url)
        if not payload:
            return MarketMetadata(
                pe_ratio=None,
                marketcap=None,
                industry=None,
                sector=None,
                indices=indices_hint,
            )

        result = (
            payload.get("quoteSummary", {})
            .get("result") or [None]
        )[0]
        if not result:
            return MarketMetadata(
                pe_ratio=None,
                marketcap=None,
                industry=None,
                sector=None,
                indices=indices_hint,
            )

        summary = result.get("summaryDetail") or {}
        profile = result.get("assetProfile") or {}
        price = result.get("price") or {}

        pe_ratio = _to_decimal(_extract_raw(summary.get("trailingPE")))
        marketcap = _to_decimal(_extract_raw(price.get("marketCap")))
        industry = profile.get("industry")
        sector = profile.get("sector")

        return MarketMetadata(
            pe_ratio=pe_ratio,
            marketcap=marketcap,
            industry=industry,
            sector=sector,
            indices=indices_hint,
        )

    def _get_json(self, url: str) -> Optional[dict]:
        last_error = None
        for attempt in range(1, self.max_retries + 1):
            try:
                response = requests.get(url, timeout=self.timeout_seconds)
                if response.status_code in (429, 500, 502, 503, 504):
                    raise RuntimeError(f"status {response.status_code}")
                response.raise_for_status()
                return response.json()
            except (requests.RequestException, json.JSONDecodeError, RuntimeError) as exc:
                last_error = exc
                sleep_for = min(2 ** attempt, 8)
                logger.warning(
                    "yahoo_request_retry",
                    extra={"url": url, "attempt": attempt, "error": str(exc)},
                )
                time.sleep(sleep_for)
        logger.error("yahoo_request_failed", extra={"url": url, "error": str(last_error)})
        return None


def _to_epoch(value: date) -> int:
    return int(datetime(value.year, value.month, value.day, tzinfo=timezone.utc).timestamp())


def _to_decimal(value) -> Optional[Decimal]:
    if value is None:
        return None
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return None


def _extract_raw(node):
    if isinstance(node, dict):
        return node.get("raw")
    return node


def _indices_hint(ticker: str) -> Optional[str]:
    mapping = {
        "^GSPC": "S&P 500",
        "^IXIC": "NASDAQ Composite",
        "GC=F": "Gold",
        "^TNX": "US 10Y Yield",
    }
    return mapping.get(ticker)
