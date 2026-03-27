import uuid
from datetime import datetime
from typing import Iterable

from psycopg2.extras import execute_values


def ensure_table(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS positions_metrics_closed (
            id UUID PRIMARY KEY,
            user_id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            ticker TEXT NOT NULL,
            as_of_date DATE NOT NULL,
            closed_quantity DECIMAL(18,6) NOT NULL,
            realized_cost_basis DECIMAL(18,2),
            realized_proceeds DECIMAL(18,2),
            realized_pl DECIMAL(18,2),
            return_pct DECIMAL(18,6),
            currency TEXT NOT NULL DEFAULT 'USD',
            calc_version TEXT NOT NULL DEFAULT 'v1',
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
            UNIQUE (user_id, account_id, ticker, as_of_date)
        )
        """
    )


def upsert_metrics(cur, rows: Iterable[dict]) -> int:
    rows = list(rows)
    if not rows:
        return 0

    columns = [
        "id",
        "user_id",
        "account_id",
        "ticker",
        "as_of_date",
        "closed_quantity",
        "realized_cost_basis",
        "realized_proceeds",
        "realized_pl",
        "return_pct",
        "currency",
        "calc_version",
        "updated_at",
    ]

    values = []
    for row in rows:
        values.append(
            (
                str(row.get("id") or uuid.uuid4()),
                row["user_id"],
                row["account_id"],
                row["ticker"],
                row["as_of_date"],
                row.get("closed_quantity"),
                row.get("realized_cost_basis"),
                row.get("realized_proceeds"),
                row.get("realized_pl"),
                row.get("return_pct"),
                row.get("currency", "USD"),
                row.get("calc_version", "v1"),
                row.get("updated_at") or datetime.utcnow(),
            )
        )

    insert_sql = f"""
        INSERT INTO positions_metrics_closed ({", ".join(columns)}) VALUES %s
        ON CONFLICT (user_id, account_id, ticker, as_of_date) DO UPDATE SET
            closed_quantity = EXCLUDED.closed_quantity,
            realized_cost_basis = EXCLUDED.realized_cost_basis,
            realized_proceeds = EXCLUDED.realized_proceeds,
            realized_pl = EXCLUDED.realized_pl,
            return_pct = EXCLUDED.return_pct,
            currency = EXCLUDED.currency,
            calc_version = EXCLUDED.calc_version,
            updated_at = EXCLUDED.updated_at
    """

    execute_values(cur, insert_sql, values, page_size=len(values))
    return len(values)
