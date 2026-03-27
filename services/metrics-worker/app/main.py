import logging
from datetime import date, datetime

from fastapi import FastAPI, Request

from app.db import get_db_conn
from app.metrics.portfolio_metrics import recompute_all, recompute_for_account


app = FastAPI()
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/metrics/recompute")
async def recompute_metrics(request: Request):
    payload = await request.json() if request.headers.get("content-type") else {}
    user_id = payload.get("user_id") if isinstance(payload, dict) else None
    account_id = payload.get("account_id") if isinstance(payload, dict) else None
    as_of_value = payload.get("as_of_date") if isinstance(payload, dict) else None

    as_of_date = date.today()
    if as_of_value:
        try:
            as_of_date = datetime.fromisoformat(as_of_value).date()
        except ValueError:
            return {"error": "invalid as_of_date, use YYYY-MM-DD"}

    conn = get_db_conn()
    try:
        if user_id and account_id:
            inserted = recompute_for_account(conn, user_id, account_id, as_of_date)
        else:
            inserted = recompute_all(conn, as_of_date)
        return {"ok": True, "rows_written": inserted, "as_of_date": as_of_date.isoformat()}
    finally:
        conn.close()
