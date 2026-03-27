import os
import uuid
from datetime import date
from decimal import Decimal

import pytest

from app.db import get_db_conn
from app.metrics.portfolio_metrics import recompute_for_account


def _db_configured():
    return bool(os.getenv("DATABASE_URL") or os.getenv("DB_USER"))


@pytest.mark.integration
def test_recompute_for_account_integration():
    if not _db_configured():
        pytest.skip("DB not configured")

    user_id = f"test-user-{uuid.uuid4()}"
    account_id = f"test-acct-{uuid.uuid4()}"
    ticker = "AAPL"
    as_of_date = date(2026, 3, 23)
    activity_id_1 = uuid.uuid4()
    activity_id_2 = uuid.uuid4()

    conn = get_db_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO activities (
                    id, user_id, account_id, source_id, external_transaction_id,
                    ticker, activity_type, quantity, price, amount, currency,
                    activity_date, status, description, uploaded_file_name
                ) VALUES
                (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s),
                (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                """,
                (
                    str(activity_id_1),
                    user_id,
                    account_id,
                    None,
                    "ext-1",
                    ticker,
                    "buy",
                    Decimal("10"),
                    Decimal("100"),
                    Decimal("1000"),
                    "USD",
                    date(2026, 1, 10),
                    "filled",
                    None,
                    None,
                    str(activity_id_2),
                    user_id,
                    account_id,
                    None,
                    "ext-2",
                    ticker,
                    "dividend",
                    None,
                    None,
                    Decimal("25"),
                    "USD",
                    date(2026, 2, 1),
                    "filled",
                    None,
                    None,
                ),
            )
            cur.execute(
                """
                INSERT INTO prices (ticker, price_date, close_price, source)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (ticker, price_date) DO UPDATE SET
                    close_price = EXCLUDED.close_price,
                    source = EXCLUDED.source
                """,
                (ticker, as_of_date, Decimal("150"), "test"),
            )
        conn.commit()

        rows_written = recompute_for_account(conn, user_id, account_id, as_of_date)
        assert rows_written >= 1

        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT quantity, market_value, xirr
                FROM positions_metrics
                WHERE user_id = %s AND account_id = %s AND ticker = %s AND as_of_date = %s
                """,
                (user_id, account_id, ticker, as_of_date),
            )
            row = cur.fetchone()
            assert row is not None
            assert row[0] == Decimal("10")
            assert row[1] == Decimal("1500.00")
    finally:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM positions_metrics WHERE user_id = %s", (user_id,))
            cur.execute("DELETE FROM activities WHERE id = %s", (str(activity_id_1),))
            cur.execute("DELETE FROM activities WHERE id = %s", (str(activity_id_2),))
        conn.commit()
        conn.close()
