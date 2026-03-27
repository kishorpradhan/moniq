import csv
import logging
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from io import StringIO
from typing import List, Optional

import requests

from app.market_data.provider.base import MarketDataProvider
from app.market_data.types import MarketMetadata, PricePoint


logger = logging.getLogger("market-data")


class StooqProvider(MarketDataProvider):
    name = "stooq"

    def fetch_daily_prices(
        self,
        ticker: str,
        start_date: date,
        end_date: date,
        metadata: Optional[MarketMetadata] = None,
    ) -> List[PricePoint]:
        symbol = _to_stooq_symbol(ticker)
        if not symbol:
            return []

        url = f"https://stooq.com/q/d/l/?s={symbol}&i=d"
        response = requests.get(url, timeout=10)
        response.raise_for_status()

        data = response.text
        reader = csv.DictReader(StringIO(data))
        points: List[PricePoint] = []
        for row in reader:
            price_date = _parse_date(row.get("Date"))
            if price_date is None:
                continue
            if price_date < start_date or price_date > end_date:
                continue
            close_price = _to_decimal(row.get("Close"))
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


def _to_stooq_symbol(ticker: str) -> Optional[str]:
    symbol = (ticker or "").strip()
    if not symbol:
        return None
    if symbol.startswith("^") or "=" in symbol:
        return None
    if symbol.endswith(".US") or symbol.endswith(".us"):
        return symbol.lower()
    return f"{symbol}.us".lower()


def _parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
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
