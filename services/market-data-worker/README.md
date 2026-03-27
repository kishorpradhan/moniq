# Market Data Worker

Cloud Run service for fetching market data and storing daily prices in Postgres.

Endpoints:
- `GET /health`
- `POST /market-data/refresh`

Payload example:
```
{
  "tickers": ["AAPL", "MSFT", "^GSPC", "^TNX"],
  "end_date": "2026-03-22",
  "days": 30
}
```

If `tickers` is omitted, the service will pull distinct tickers from the `activities`
 table and add reference symbols: `^GSPC`, `^IXIC`, `GC=F`, `^TNX`.

Providers (in order): Yahoo chart API → yfinance → Alpha Vantage → Stooq (CSV).
