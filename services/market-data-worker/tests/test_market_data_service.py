from app.market_data.service.market_data_service import _normalize_tickers


def test_normalize_tickers_dedupes_and_strips():
    tickers = [" AAPL ", "MSFT", None, "", "AAPL", "^GSPC", "^GSPC"]
    assert _normalize_tickers(tickers) == ["AAPL", "MSFT", "^GSPC"]


def test_normalize_tickers_preserves_case():
    tickers = ["aapl", "AAPL"]
    assert _normalize_tickers(tickers) == ["aapl", "AAPL"]
