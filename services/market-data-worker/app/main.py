import logging
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.db import get_db_conn
from app.market_data.provider.stooq_provider import StooqProvider
from app.market_data.provider.alphavantage_provider import AlphaVantageProvider
from app.market_data.provider.stockdata_provider import StockDataProvider
from app.market_data.service.market_data_service import (
    build_default_tickers,
    fetch_and_store_prices_for_tickers,
)


app = FastAPI()
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/market-data/refresh")
async def refresh_market_data(request: Request):
    payload = await request.json() if request.headers.get("content-type") else {}
    tickers = payload.get("tickers") if isinstance(payload, dict) else None
    end_date_value = payload.get("end_date") if isinstance(payload, dict) else None
    days_value = payload.get("days") if isinstance(payload, dict) else None
    years_value = payload.get("years") if isinstance(payload, dict) else None
    alpha_max_calls = payload.get("alpha_max_calls") if isinstance(payload, dict) else None

    conn = get_db_conn()
    try:
        alpha_max = None
        if alpha_max_calls is not None:
            try:
                alpha_max = int(alpha_max_calls)
            except (TypeError, ValueError):
                return {"error": "invalid alpha_max_calls, use integer"}
        provider = [
            StockDataProvider(),
            AlphaVantageProvider(max_calls=alpha_max),
            StooqProvider(),
        ]
        if not tickers:
            tickers = build_default_tickers(conn)
        end_date = None
        if end_date_value:
            try:
                end_date = datetime.fromisoformat(end_date_value).date()
            except ValueError:
                return {"error": "invalid end_date, use YYYY-MM-DD"}
        days = None
        if days_value is not None:
            try:
                days = int(days_value)
            except (TypeError, ValueError):
                return {"error": "invalid days, use integer"}
        years = None
        if years_value is not None:
            try:
                years = int(years_value)
            except (TypeError, ValueError):
                return {"error": "invalid years, use integer"}
        result = fetch_and_store_prices_for_tickers(
            conn,
            provider,
            tickers,
            end_date=end_date,
            days=days,
            years=years or 2,
        )
        return {"ok": True, **result}
    finally:
        conn.close()
