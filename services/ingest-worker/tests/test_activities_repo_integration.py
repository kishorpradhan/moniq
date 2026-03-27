import os
import uuid

import pytest

from app.db import get_db_conn
from app.repositories import activities as activities_repo


def _db_configured():
    return bool(os.getenv("DATABASE_URL") or os.getenv("DB_USER"))


@pytest.mark.integration
def test_batch_upsert_updates_existing_row():
    if not _db_configured():
        pytest.skip("Database not configured for integration test")

    conn = get_db_conn()
    activity_id = uuid.uuid4()
    user_id = str(uuid.uuid4())
    account_id = "562935130"

    try:
        with conn:
            with conn.cursor() as cur:
                activities_repo.ensure_table(cur)
                activities_repo.batch_upsert(
                    cur,
                    [
                        {
                            "id": activity_id,
                            "user_id": user_id,
                            "account_id": account_id,
                            "source_id": None,
                            "external_transaction_id": str(activity_id),
                            "ticker": "AAPL",
                            "activity_type": "buy",
                            "quantity": "1.00",
                            "price": "10.00",
                            "amount": "10.00",
                            "currency": "USD",
                            "activity_date": "2026-02-04",
                            "status": "filled",
                            "description": None,
                            "uploaded_file_name": "orders.csv",
                        }
                    ],
                )

            with conn.cursor() as cur:
                activities_repo.batch_upsert(
                    cur,
                    [
                        {
                            "id": activity_id,
                            "user_id": user_id,
                            "account_id": account_id,
                            "source_id": None,
                            "external_transaction_id": str(activity_id),
                            "ticker": "AAPL",
                            "activity_type": "buy",
                            "quantity": "2.00",
                            "price": "12.00",
                            "amount": "24.00",
                            "currency": "USD",
                            "activity_date": "2026-02-05",
                            "status": "filled",
                            "description": None,
                            "uploaded_file_name": "orders.csv",
                        }
                    ],
                )

            with conn.cursor() as cur:
                cur.execute(
                    "SELECT quantity, price, amount, activity_date FROM activities WHERE id = %s",
                    (str(activity_id),),
                )
                row = cur.fetchone()
                assert row is not None
                assert str(row[0]) == "2.00"
                assert str(row[1]) == "12.00"
                assert str(row[2]) == "24.00"
                assert str(row[3]) == "2026-02-05"
    finally:
        with conn:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM activities WHERE id = %s", (str(activity_id),))
        conn.close()
