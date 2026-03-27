from abc import ABC, abstractmethod
from datetime import date
from typing import Iterable, List, Optional

from app.market_data.types import MarketMetadata, PricePoint


class MarketDataProvider(ABC):
    name: str

    @abstractmethod
    def fetch_daily_prices(
        self,
        ticker: str,
        start_date: date,
        end_date: date,
        metadata: Optional[MarketMetadata] = None,
    ) -> List[PricePoint]:
        raise NotImplementedError

    @abstractmethod
    def fetch_metadata(self, ticker: str) -> Optional[MarketMetadata]:
        raise NotImplementedError

    def supports_bulk(self) -> bool:
        return False

    def fetch_daily_prices_bulk(
        self,
        tickers: Iterable[str],
        start_date: date,
        end_date: date,
    ) -> dict[str, List[PricePoint]]:
        raise NotImplementedError
