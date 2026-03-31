from __future__ import annotations

from typing import Dict, List, Tuple


def fetch_summary(cur, user_id: str) -> Dict[str, object]:
    cur.execute(
        """
        SELECT
            MAX(as_of_date) AS as_of_date,
            COALESCE(SUM(market_value), 0) AS total_value,
            COALESCE(SUM(cost_basis), 0) AS total_invested,
            COALESCE(SUM(unrealized_pl), 0) AS unrealized_pl
        FROM positions_metrics_open
        WHERE user_id = %s
        """,
        (user_id,),
    )
    open_row = cur.fetchone() or {}

    cur.execute(
        """
        SELECT
            MAX(as_of_date) AS as_of_date,
            COALESCE(SUM(realized_pl), 0) AS realized_pl
        FROM positions_metrics_closed
        WHERE user_id = %s
        """,
        (user_id,),
    )
    closed_row = cur.fetchone() or {}

    total_invested = float(open_row[2] or 0)
    unrealized_pl = float(open_row[3] or 0)

    as_of_date = _pick_latest_date(open_row[0], closed_row[0])

    return {
        "asOfDate": as_of_date,
        "totalValue": float(open_row[1] or 0),
        "totalInvested": total_invested,
        "unrealizedPl": unrealized_pl,
        "unrealizedPct": (unrealized_pl / total_invested) if total_invested else None,
        "realizedPl": float(closed_row[1] or 0),
    }


def fetch_allocation(cur, user_id: str) -> Dict[str, List[Dict[str, object]]]:
    cur.execute(
        """
        SELECT ticker,
               COALESCE(market_value, 0) AS market_value,
               contribution_pct
        FROM positions_metrics_open
        WHERE user_id = %s
        ORDER BY market_value DESC NULLS LAST
        """,
        (user_id,),
    )
    tickers = [
        {
            "ticker": row[0],
            "marketValue": float(row[1] or 0),
            "weight": float(row[2]) if row[2] is not None else None,
        }
        for row in cur.fetchall()
    ]

    cur.execute(
        """
        SELECT sector,
               COALESCE(market_value, 0) AS market_value,
               contribution_pct
        FROM portfolio_sector_allocations
        WHERE user_id = %s
        ORDER BY market_value DESC NULLS LAST
        """,
        (user_id,),
    )
    sectors = [
        {
            "sector": row[0],
            "marketValue": float(row[1] or 0),
            "weight": float(row[2]) if row[2] is not None else None,
        }
        for row in cur.fetchall()
    ]

    return {"tickers": tickers, "sectors": sectors}


def fetch_positions(cur, user_id: str) -> Dict[str, List[Dict[str, object]]]:
    cur.execute(
        """
        SELECT
            ticker,
            as_of_date,
            quantity,
            market_value,
            cost_basis,
            unrealized_pl,
            return_pct,
            dividends_received,
            xirr,
            contribution_pct
        FROM positions_metrics_open
        WHERE user_id = %s
        ORDER BY market_value DESC NULLS LAST
        """,
        (user_id,),
    )
    open_rows = [
        {
            "ticker": row[0],
            "asOfDate": _to_date(row[1]),
            "quantity": float(row[2] or 0),
            "marketValue": float(row[3] or 0),
            "costBasis": float(row[4] or 0),
            "unrealizedPl": float(row[5] or 0),
            "returnPct": float(row[6]) if row[6] is not None else None,
            "dividendsReceived": float(row[7] or 0),
            "xirr": float(row[8]) if row[8] is not None else None,
            "contributionPct": float(row[9]) if row[9] is not None else None,
        }
        for row in cur.fetchall()
    ]

    cur.execute(
        """
        SELECT
            ticker,
            as_of_date,
            closed_quantity,
            realized_cost_basis,
            realized_proceeds,
            realized_pl,
            return_pct
        FROM positions_metrics_closed
        WHERE user_id = %s
        ORDER BY realized_pl DESC NULLS LAST
        """,
        (user_id,),
    )
    closed_rows = [
        {
            "ticker": row[0],
            "asOfDate": _to_date(row[1]),
            "closedQuantity": float(row[2] or 0),
            "realizedCostBasis": float(row[3] or 0),
            "realizedProceeds": float(row[4] or 0),
            "realizedPl": float(row[5] or 0),
            "returnPct": float(row[6]) if row[6] is not None else None,
        }
        for row in cur.fetchall()
    ]

    return {"open": open_rows, "closed": closed_rows}


def fetch_recent_uploads(cur, user_id: str, limit: int = 10) -> List[Dict[str, object]]:
    cur.execute(
        """
        SELECT
            id,
            bucket,
            object_name,
            status,
            started_at,
            finished_at,
            row_count,
            inserted_count,
            skipped_count,
            error
        FROM (
            SELECT DISTINCT ON (object_name)
                id,
                bucket,
                object_name,
                status,
                started_at,
                finished_at,
                row_count,
                inserted_count,
                skipped_count,
                error
            FROM ingestion_runs
            WHERE user_id = %s
            ORDER BY object_name, started_at DESC
        ) latest
        ORDER BY started_at DESC
        LIMIT %s
        """,
        (user_id, limit),
    )
    rows = cur.fetchall()
    return [
        {
            "id": row[0],
            "bucket": row[1],
            "objectName": row[2],
            "status": row[3],
            "startedAt": _to_datetime(row[4]),
            "finishedAt": _to_datetime(row[5]),
            "rowCount": row[6],
            "insertedCount": row[7],
            "skippedCount": row[8],
            "error": row[9],
            "formatMismatch": _is_format_mismatch(row[3], row[6], row[7], row[8]),
        }
        for row in rows
    ]


def _to_date(value) -> str:
    if not value:
        return ""
    return str(value)[:10]


def _to_datetime(value) -> str | None:
    if not value:
        return None
    return str(value)


def _is_format_mismatch(status, row_count, inserted_count, skipped_count) -> bool:
    if status != "success":
        return False
    if row_count is None or skipped_count is None:
        return False
    if inserted_count is None:
        inserted_count = 0
    return inserted_count == 0 and skipped_count > 0 and row_count == skipped_count


def _pick_latest_date(a, b) -> str | None:
    if not a and not b:
        return None
    if not a:
        return _to_date(b)
    if not b:
        return _to_date(a)
    return _to_date(max(a, b))
