import logging
import os
import time
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import List, Optional

import requests

from app.market_data.provider.base import MarketDataProvider
from app.market_data.types import MarketMetadata, PricePoint


class AlphaVantageProvider(MarketDataProvider):
    name = "alphavantage"

    def __init__(
        self,
        api_key: Optional[str] = None,
        timeout_seconds: int = 10,
        max_calls: Optional[int] = None,
    ):
        self.api_key = api_key or os.getenv("ALPHAVANTAGE_API_KEY")
        self.timeout_seconds = timeout_seconds
        if max_calls is None:
            max_calls = int(os.getenv("ALPHAVANTAGE_MAX_CALLS", "20"))
        self.max_calls = max_calls
        self.calls = 0

    def fetch_daily_prices(
        self,
        ticker: str,
        start_date: date,
        end_date: date,
        metadata: Optional[MarketMetadata] = None,
    ) -> List[PricePoint]:
        if not self.api_key:
            raise RuntimeError("ALPHAVANTAGE_API_KEY not set")
        if self.calls >= self.max_calls:
            raise RuntimeError("alphavantage_rate_limit")
        self.calls += 1

        params = {
            "function": "TIME_SERIES_DAILY_ADJUSTED",
            "symbol": ticker,
            "outputsize": "compact",
            "apikey": self.api_key,
        }
        response = requests.get(
            "https://www.alphavantage.co/query",
            params=params,
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()

        if "Error Message" in payload:
            raise RuntimeError(payload["Error Message"])
        if "Note" in payload:
            self.calls = self.max_calls
            logging.warning("alphavantage_rate_limit_note", extra={"ticker": ticker})
            time.sleep(15)
            raise RuntimeError(payload["Note"])

        series = payload.get("Time Series (Daily)") or {}
        if not series:
            return []

        points: List[PricePoint] = []
        for date_str, values in series.items():
            price_date = _parse_date(date_str)
            if price_date is None:
                continue
            if price_date < start_date or price_date > end_date:
                continue
            close_price = _to_decimal(values.get("4. close"))
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


def _parse_date(value: str) -> Optional[date]:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
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
