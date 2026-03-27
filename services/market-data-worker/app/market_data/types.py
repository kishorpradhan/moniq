from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Optional


@dataclass(frozen=True)
class PricePoint:
    ticker: str
    price_date: date
    close_price: Decimal
    source: str
    pe_ratio: Optional[Decimal] = None
    marketcap: Optional[Decimal] = None
    industry: Optional[str] = None
    sector: Optional[str] = None
    indices: Optional[str] = None


@dataclass(frozen=True)
class MarketMetadata:
    pe_ratio: Optional[Decimal]
    marketcap: Optional[Decimal]
    industry: Optional[str]
    sector: Optional[str]
    indices: Optional[str]
