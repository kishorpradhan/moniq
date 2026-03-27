from datetime import date
from decimal import Decimal
from unittest.mock import Mock, patch

from app.market_data.provider.yahoo_finance import YahooFinanceProvider


def _mock_response(payload, status=200):
    response = Mock()
    response.status_code = status
    response.json.return_value = payload
    response.raise_for_status.return_value = None
    return response


def test_fetch_daily_prices_parses_chart():
    payload = {
        "chart": {
            "result": [
                {
                    "timestamp": [1700000000, 1700086400],
                    "indicators": {"quote": [{"close": [100.123, 101.9]}]},
                }
            ],
            "error": None,
        }
    }
    provider = YahooFinanceProvider(max_retries=1)
    with patch("app.market_data.provider.yahoo_finance.requests.get") as mocked:
        mocked.return_value = _mock_response(payload)
        points = provider.fetch_daily_prices(
            "AAPL",
            date(2024, 1, 1),
            date(2024, 1, 3),
            metadata=None,
        )
    assert len(points) == 2
    assert points[0].ticker == "AAPL"
    assert points[0].close_price == Decimal("100.12")
    assert points[1].close_price == Decimal("101.90")


def test_fetch_metadata_parses_quote_summary():
    payload = {
        "quoteSummary": {
            "result": [
                {
                    "summaryDetail": {"trailingPE": {"raw": 12.345}},
                    "price": {"marketCap": {"raw": 2500000000}},
                    "assetProfile": {"industry": "Software", "sector": "Tech"},
                }
            ]
        }
    }
    provider = YahooFinanceProvider(max_retries=1)
    with patch("app.market_data.provider.yahoo_finance.requests.get") as mocked:
        mocked.return_value = _mock_response(payload)
        meta = provider.fetch_metadata("AAPL")
    assert meta is not None
    assert meta.pe_ratio == Decimal("12.34")
    assert meta.marketcap == Decimal("2500000000.00")
    assert meta.industry == "Software"
    assert meta.sector == "Tech"
