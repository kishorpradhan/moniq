import os
from datetime import date
from decimal import Decimal

import pytest

from app.db import get_db_conn
from app.market_data.repository import prices as prices_repo
from app.market_data.types import PricePoint


def _db_configured():
    return bool(os.getenv("DATABASE_URL") or os.getenv("DB_USER"))


@pytest.mark.integration
def test_upsert_prices_updates_existing_row():
    if not _db_configured():
        pytest.skip("Database not configured for integration test")

    conn = get_db_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                prices_repo.ensure_table(cur)
                prices_repo.upsert_prices(
                    cur,
                    [
                        PricePoint(
                            ticker="AAPL",
                            price_date=date(2026, 2, 1),
                            close_price=Decimal("100.00"),
                            source="test",
                            pe_ratio=Decimal("10.00"),
                            marketcap=Decimal("1000000000.00"),
                            industry="Software",
                            sector="Tech",
                            indices="S&P 500",
                        )
                    ],
                )

            with conn.cursor() as cur:
                prices_repo.upsert_prices(
                    cur,
                    [
                        PricePoint(
                            ticker="AAPL",
                            price_date=date(2026, 2, 1),
                            close_price=Decimal("110.00"),
                            source="test",
                            pe_ratio=Decimal("11.00"),
                            marketcap=Decimal("1100000000.00"),
                            industry="Software",
                            sector="Tech",
                            indices="S&P 500",
                        )
                    ],
                )

            with conn.cursor() as cur:
                cur.execute(
                    "SELECT close_price, pe_ratio, marketcap FROM prices WHERE ticker = %s AND price_date = %s",
                    ("AAPL", "2026-02-01"),
                )
                row = cur.fetchone()
                assert row is not None
                assert str(row[0]) == "110.00"
                assert str(row[1]) == "11.00"
                assert str(row[2]) == "1100000000.00"
    finally:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM prices WHERE ticker = %s AND price_date = %s",
                    ("AAPL", "2026-02-01"),
                )
        conn.close()
