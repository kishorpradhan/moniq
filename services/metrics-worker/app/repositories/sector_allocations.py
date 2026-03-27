import uuid
from datetime import datetime
from typing import Iterable

from psycopg2.extras import execute_values


def ensure_table(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS portfolio_sector_allocations (
            id UUID PRIMARY KEY,
            user_id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            as_of_date DATE NOT NULL,
            sector TEXT NOT NULL,
            market_value DECIMAL(18,2),
            contribution_pct DECIMAL(18,6),
            currency TEXT NOT NULL DEFAULT 'USD',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE (user_id, account_id, sector, as_of_date)
        )
        """
    )


def upsert_allocations(cur, rows: Iterable[dict]) -> int:
    rows = list(rows)
    if not rows:
        return 0

    columns = [
        "id",
        "user_id",
        "account_id",
        "as_of_date",
        "sector",
        "market_value",
        "contribution_pct",
        "currency",
        "updated_at",
    ]

    values = []
    for row in rows:
        values.append(
            (
                str(row.get("id") or uuid.uuid4()),
                row["user_id"],
                row["account_id"],
                row["as_of_date"],
                row["sector"],
                row.get("market_value"),
                row.get("contribution_pct"),
                row.get("currency", "USD"),
                row.get("updated_at") or datetime.utcnow(),
            )
        )

    insert_sql = f"""
        INSERT INTO portfolio_sector_allocations ({", ".join(columns)}) VALUES %s
        ON CONFLICT (user_id, account_id, sector, as_of_date) DO UPDATE SET
            market_value = EXCLUDED.market_value,
            contribution_pct = EXCLUDED.contribution_pct,
            currency = EXCLUDED.currency,
            updated_at = EXCLUDED.updated_at
    """

    execute_values(cur, insert_sql, values, page_size=len(values))
    return len(values)
