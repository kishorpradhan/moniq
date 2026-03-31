import base64
import json
import logging

from fastapi import HTTPException

from app.metrics.portfolio_metrics import recompute_for_account


logger = logging.getLogger("metrics-worker")


async def handle_ingestion_complete(request, conn):
    envelope = await request.json()
    if "message" not in envelope:
        raise HTTPException(status_code=400, detail="Invalid Pub/Sub message")

    message = envelope["message"]
    data = message.get("data")

    if not data:
        raise HTTPException(status_code=400, detail="Missing message data")

    decoded = base64.b64decode(data).decode("utf-8")
    payload = json.loads(decoded)

    user_id = payload.get("user_id")
    account_id = payload.get("account_id")
    as_of_date = payload.get("as_of_date")

    if not user_id or not account_id:
        raise HTTPException(status_code=400, detail="Missing user_id or account_id")

    logger.info(
        "ingestion_complete_received",
        extra={
            "user_id": user_id,
            "account_id": account_id,
            "ingestion_run_id": payload.get("ingestion_run_id"),
            "object_name": payload.get("object_name"),
        },
    )

    inserted = recompute_for_account(conn, user_id, account_id, _parse_as_of(as_of_date))
    return {"ok": True, "rows_written": inserted}


def _parse_as_of(value):
    from datetime import datetime, date

    if not value:
        return date.today()
    try:
        return datetime.fromisoformat(value).date()
    except ValueError:
        return date.today()
