import logging
from datetime import date
from decimal import Decimal, InvalidOperation
from typing import List, Optional

from app.market_data.provider.base import MarketDataProvider
from app.market_data.types import MarketMetadata, PricePoint


logger = logging.getLogger("market-data")


class YFinanceProvider(MarketDataProvider):
    name = "yfinance"

    def fetch_daily_prices(
        self,
        ticker: str,
        start_date: date,
        end_date: date,
        metadata: Optional[MarketMetadata] = None,
    ) -> List[PricePoint]:
        try:
            import yfinance as yf  # type: ignore
        except Exception as exc:
            raise RuntimeError("yfinance not available") from exc

        ticker = (ticker or "").strip()
        if not ticker:
            return []

        yf_ticker = yf.Ticker(ticker)
        df = yf_ticker.history(start=start_date, end=end_date, interval="1d")
        if df is None or df.empty:
            return []

        df = df.reset_index()
        points: List[PricePoint] = []
        meta = metadata or self.fetch_metadata(ticker)

        for _, row in df.iterrows():
            close_price = _to_decimal(row.get("Close"))
            if close_price is None:
                continue
            price_date = row.get("Date")
            if price_date is None:
                continue
            price_date = price_date.date() if hasattr(price_date, "date") else price_date
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
        try:
            import yfinance as yf  # type: ignore
        except Exception as exc:
            raise RuntimeError("yfinance not available") from exc

        ticker = (ticker or "").strip()
        if not ticker:
            return None

        yf_ticker = yf.Ticker(ticker)
        info = {}
        try:
            info = yf_ticker.info or {}
        except Exception:
            info = {}

        pe_ratio = _to_decimal(info.get("trailingPE"))
        marketcap = _to_decimal(info.get("marketCap"))
        industry = info.get("industry")
        sector = info.get("sector")
        indices = _indices_hint(ticker)

        return MarketMetadata(
            pe_ratio=pe_ratio,
            marketcap=marketcap,
            industry=industry,
            sector=sector,
            indices=indices,
        )


def _to_decimal(value) -> Optional[Decimal]:
    if value is None:
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
