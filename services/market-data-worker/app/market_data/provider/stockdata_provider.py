import logging
import os
import time
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import List, Optional

import requests

from app.market_data.provider.base import MarketDataProvider
from app.market_data.types import MarketMetadata, PricePoint


logger = logging.getLogger("market-data")


class StockDataProvider(MarketDataProvider):
    name = "stockdata"

    def __init__(
        self,
        api_key: Optional[str] = None,
        timeout_seconds: int = 10,
        max_period_days: int = 180,
    ):
        self.api_key = api_key or os.getenv("STOCKDATA_API_KEY")
        self.timeout_seconds = timeout_seconds
        self.max_period_days = max_period_days

    def fetch_daily_prices(
        self,
        ticker: str,
        start_date: date,
        end_date: date,
        metadata: Optional[MarketMetadata] = None,
    ) -> List[PricePoint]:
        if not self.api_key:
            raise RuntimeError("STOCKDATA_API_KEY not set")

        points: List[PricePoint] = []
        for chunk_start, chunk_end in _chunk_ranges(start_date, end_date, self.max_period_days):
            payload = self._fetch_range(ticker, chunk_start, chunk_end)
            for row in payload:
                price_date = _parse_date(row.get("date"))
                if price_date is None:
                    continue
                if price_date < start_date or price_date > end_date:
                    continue
                close_price = _to_decimal(row.get("close"))
                if close_price is None:
                    continue
                points.append(
                    PricePoint(
                        ticker=ticker,
                        price_date=price_date,
                        close_price=close_price,
                        source=self.name,
                        pe_ratio=metadata.pe_ratio if metadata else None,
                        marketcap=metadata.marketcap if metadata else None,
                        industry=metadata.industry if metadata else None,
                        sector=metadata.sector if metadata else None,
                        indices=metadata.indices if metadata else None,
                    )
                )
        return points

    def fetch_metadata(self, ticker: str) -> Optional[MarketMetadata]:
        return MarketMetadata(
            pe_ratio=None,
            marketcap=None,
            industry=None,
            sector=None,
            indices=_indices_hint(ticker),
        )

    def _fetch_range(self, ticker: str, start_date: date, end_date: date) -> list[dict]:
        params = {
            "symbols": ticker,
            "api_token": self.api_key,
            "date_from": start_date.isoformat(),
            "date_to": end_date.isoformat(),
        }
        url = "https://api.stockdata.org/v1/data/eod"
        for attempt in range(3):
            response = requests.get(url, params=params, timeout=self.timeout_seconds)
            if response.status_code == 429 and attempt < 2:
                time.sleep(2 * (attempt + 1))
                continue
            response.raise_for_status()
            payload = response.json()
            return payload.get("data") or []
        return []


def _chunk_ranges(start_date: date, end_date: date, max_days: int):
    current = start_date
    while current <= end_date:
        chunk_end = min(current + timedelta(days=max_days - 1), end_date)
        yield current, chunk_end
        current = chunk_end + timedelta(days=1)


def _parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    raw = value.split("T")[0]
    try:
        return datetime.strptime(raw, "%Y-%m-%d").date()
    except ValueError:
        return None


def _to_decimal(value) -> Optional[Decimal]:
    if value in (None, ""):
        return None
    try:
        return Decimal(str(value)).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return None


def _indices_hint(ticker: str) -> Optional[str]:
    mapping = {
        "^GSPC": "S&P 500",
        "^IXIC": "NASDAQ Composite",
        "GC=F": "Gold",
        "^TNX": "US 10Y Yield",
    }
    return mapping.get(ticker)
