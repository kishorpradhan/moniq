import uuid
from datetime import datetime
from typing import Iterable

from psycopg2.extras import execute_values


def ensure_table(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS positions_metrics_open (
            id UUID PRIMARY KEY,
            user_id TEXT NOT NULL,
            account_id TEXT NOT NULL,
            ticker TEXT NOT NULL,
            as_of_date DATE NOT NULL,
            position_status TEXT NOT NULL CHECK (position_status IN ('open', 'closed')),
            quantity DECIMAL(18,6) NOT NULL,
            market_value DECIMAL(18,2),
            cost_basis DECIMAL(18,2),
            unrealized_pl DECIMAL(18,2),
            return_pct DECIMAL(18,6),
            dividends_received DECIMAL(18,2),
            contribution_pct DECIMAL(18,6),
            xirr DECIMAL(18,6),
            total_inflows DECIMAL(18,2),
            total_outflows DECIMAL(18,2),
            net_cash_flow DECIMAL(18,2),
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
        "position_status",
        "quantity",
        "market_value",
        "cost_basis",
        "unrealized_pl",
        "return_pct",
        "dividends_received",
        "contribution_pct",
        "xirr",
        "total_inflows",
        "total_outflows",
        "net_cash_flow",
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
                row["position_status"],
                row["quantity"],
                row.get("market_value"),
                row.get("cost_basis"),
                row.get("unrealized_pl"),
                row.get("return_pct"),
                row.get("dividends_received"),
                row.get("contribution_pct"),
                row.get("xirr"),
                row.get("total_inflows"),
                row.get("total_outflows"),
                row.get("net_cash_flow"),
                row.get("currency", "USD"),
                row.get("calc_version", "v1"),
                row.get("updated_at") or datetime.utcnow(),
            )
        )

    insert_sql = f"""
        INSERT INTO positions_metrics_open ({", ".join(columns)}) VALUES %s
        ON CONFLICT (user_id, account_id, ticker, as_of_date) DO UPDATE SET
            position_status = EXCLUDED.position_status,
            quantity = EXCLUDED.quantity,
            market_value = EXCLUDED.market_value,
            cost_basis = EXCLUDED.cost_basis,
            unrealized_pl = EXCLUDED.unrealized_pl,
            return_pct = EXCLUDED.return_pct,
            dividends_received = EXCLUDED.dividends_received,
            contribution_pct = EXCLUDED.contribution_pct,
            xirr = EXCLUDED.xirr,
            total_inflows = EXCLUDED.total_inflows,
            total_outflows = EXCLUDED.total_outflows,
            net_cash_flow = EXCLUDED.net_cash_flow,
            currency = EXCLUDED.currency,
            calc_version = EXCLUDED.calc_version,
            updated_at = EXCLUDED.updated_at
    """

    execute_values(cur, insert_sql, values, page_size=len(values))
    return len(values)
