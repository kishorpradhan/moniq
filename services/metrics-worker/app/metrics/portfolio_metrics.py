from __future__ import annotations

import logging
from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from typing import Iterable, List, Optional, Tuple

from app.metrics.xirr import compute_xirr

logger = logging.getLogger("portfolio-metrics")


@dataclass
class ActivityRow:
    user_id: str
    account_id: str
    ticker: str
    activity_type: str
    quantity: Optional[Decimal]
    price: Optional[Decimal]
    amount: Decimal
    currency: str
    activity_date: date


@dataclass
class PositionState:
    open_quantity: Decimal
    open_cost_basis: Decimal
    closed_quantity: Decimal
    realized_cost_basis: Decimal
    realized_proceeds: Decimal
    realized_pl: Decimal
    dividends_received_open: Decimal
    cashflows: List[tuple[date, Decimal]]


def recompute_for_account(conn, user_id: str, account_id: str, as_of_date: date) -> int:
    from app.repositories import positions_metrics as metrics_repo
    from app.repositories import positions_metrics_closed as closed_repo
    from app.repositories import sector_allocations as sector_repo

    activities = _fetch_activities(conn, user_id=user_id, account_id=account_id)
    open_rows, closed_rows, sector_rows = _compute_metrics(activities, as_of_date, conn)
    with conn.cursor() as cur:
        metrics_repo.ensure_table(cur)
        closed_repo.ensure_table(cur)
        sector_repo.ensure_table(cur)
        inserted = metrics_repo.upsert_metrics(cur, open_rows)
        closed_repo.upsert_metrics(cur, closed_rows)
        sector_repo.upsert_allocations(cur, sector_rows)
    conn.commit()
    return inserted


def recompute_all(conn, as_of_date: date) -> int:
    from app.repositories import positions_metrics as metrics_repo
    from app.repositories import positions_metrics_closed as closed_repo
    from app.repositories import sector_allocations as sector_repo

    activities = _fetch_activities(conn)
    open_rows, closed_rows, sector_rows = _compute_metrics(activities, as_of_date, conn)
    with conn.cursor() as cur:
        metrics_repo.ensure_table(cur)
        closed_repo.ensure_table(cur)
        sector_repo.ensure_table(cur)
        inserted = metrics_repo.upsert_metrics(cur, open_rows)
        closed_repo.upsert_metrics(cur, closed_rows)
        sector_repo.upsert_allocations(cur, sector_rows)
    conn.commit()
    return inserted


def _fetch_activities(conn, user_id: Optional[str] = None, account_id: Optional[str] = None):
    clauses = ["ticker IS NOT NULL"]
    params = []
    if user_id:
        clauses.append("user_id = %s")
        params.append(user_id)
    if account_id:
        clauses.append("account_id = %s")
        params.append(account_id)

    sql = f"""
        SELECT user_id,
               account_id,
               ticker,
               activity_type,
               quantity,
               price,
               amount,
               currency,
               activity_date
        FROM activities
        WHERE {' AND '.join(clauses)}
        ORDER BY activity_date ASC
    """
    with conn.cursor() as cur:
        cur.execute(sql, tuple(params))
        rows = cur.fetchall()
    activities = []
    for row in rows:
        activities.append(
            ActivityRow(
                user_id=row[0],
                account_id=row[1],
                ticker=row[2],
                activity_type=row[3],
                quantity=row[4],
                price=row[5],
                amount=row[6],
                currency=row[7] or "USD",
                activity_date=row[8],
            )
        )
    return activities


def _compute_metrics(
    activities: Iterable[ActivityRow], as_of_date: date, conn
) -> Tuple[List[dict], List[dict], List[dict]]:
    grouped = defaultdict(list)
    for activity in activities:
        key = (activity.user_id, activity.account_id, activity.ticker)
        grouped[key].append(activity)

    open_rows: List[dict] = []
    closed_rows: List[dict] = []
    sector_rows: List[dict] = []
    open_market_values = defaultdict(Decimal)
    open_sector_values = defaultdict(lambda: defaultdict(Decimal))

    for (user_id, account_id, ticker), rows in grouped.items():
        rows.sort(key=lambda r: r.activity_date)
        position = _build_position(rows)

        market_value = None
        sector = "Unknown"
        if position.open_quantity > 0:
            price_info = _latest_price_with_meta(conn, ticker, as_of_date)
            if price_info is not None:
                price, _price_date, sector, _industry = price_info
                market_value = (price * position.open_quantity).quantize(Decimal("0.01"))

        cashflows = list(position.cashflows)
        if position.open_quantity > 0 and market_value is not None and market_value != 0:
            cashflows.append((as_of_date, market_value))

        xirr = compute_xirr(cashflows) if position.open_quantity > 0 else None
        inflows, outflows, net = _sum_cashflows(cashflows)

        unrealized_pl = None
        return_pct = None
        if position.open_quantity > 0 and market_value is not None:
            unrealized_pl = (market_value - position.open_cost_basis).quantize(Decimal("0.01"))
            if position.open_cost_basis > 0:
                return_pct = (unrealized_pl / position.open_cost_basis).quantize(Decimal("0.000001"))

        open_rows.append(
            {
                "user_id": user_id,
                "account_id": account_id,
                "ticker": ticker,
                "as_of_date": as_of_date,
                "position_status": "open",
                "quantity": position.open_quantity,
                "market_value": market_value,
                "cost_basis": position.open_cost_basis,
                "unrealized_pl": unrealized_pl,
                "return_pct": return_pct,
                "dividends_received": position.dividends_received_open,
                "xirr": xirr,
                "total_inflows": inflows,
                "total_outflows": outflows,
                "net_cash_flow": net,
                "currency": rows[0].currency if rows else "USD",
            }
        )

        closed_rows.append(
            {
                "user_id": user_id,
                "account_id": account_id,
                "ticker": ticker,
                "as_of_date": as_of_date,
                "closed_quantity": position.closed_quantity,
                "realized_cost_basis": position.realized_cost_basis,
                "realized_proceeds": position.realized_proceeds,
                "realized_pl": position.realized_pl,
                "return_pct": _safe_return_pct(position.realized_pl, position.realized_cost_basis),
                "currency": rows[0].currency if rows else "USD",
            }
        )

        if position.open_quantity > 0 and market_value is not None:
            open_market_values[(user_id, account_id)] += market_value
            open_sector_values[(user_id, account_id)][sector or "Unknown"] += market_value

    for row in open_rows:
        key = (row["user_id"], row["account_id"])
        total_value = open_market_values.get(key)
        if total_value and row.get("market_value"):
            row["contribution_pct"] = (row["market_value"] / total_value).quantize(
                Decimal("0.000001")
            )
        else:
            row["contribution_pct"] = None

    for (user_id, account_id), sector_map in open_sector_values.items():
        total_value = open_market_values.get((user_id, account_id))
        for sector, value in sector_map.items():
            pct = None
            if total_value and value is not None:
                pct = (value / total_value).quantize(Decimal("0.000001"))
            sector_rows.append(
                {
                    "user_id": user_id,
                    "account_id": account_id,
                    "as_of_date": as_of_date,
                    "sector": sector or "Unknown",
                    "market_value": value.quantize(Decimal("0.01")),
                    "contribution_pct": pct,
                }
            )

    return open_rows, closed_rows, sector_rows


def _build_cashflows(rows: Iterable[ActivityRow]):
    flows: List[tuple[date, Decimal]] = []
    for row in rows:
        amount = _resolve_amount(row)
        if amount is None:
            continue
        if row.activity_type == "buy":
            flows.append((row.activity_date, -abs(amount)))
        elif row.activity_type == "sell":
            flows.append((row.activity_date, abs(amount)))
        elif row.activity_type == "dividend":
            flows.append((row.activity_date, abs(amount)))
        elif row.activity_type == "withdrawal":
            flows.append((row.activity_date, abs(amount)))
        elif row.activity_type == "deposit":
            flows.append((row.activity_date, -abs(amount)))
        elif row.activity_type == "fee":
            flows.append((row.activity_date, -abs(amount)))
    return flows


def _resolve_amount(row: ActivityRow) -> Optional[Decimal]:
    if row.amount is not None:
        return Decimal(row.amount)
    if row.quantity is None or row.price is None:
        return None
    return (Decimal(row.quantity) * Decimal(row.price)).quantize(Decimal("0.01"))


def _sum_cashflows(flows: Iterable[tuple[date, Decimal]]):
    inflows = Decimal("0")
    outflows = Decimal("0")
    for _, amount in flows:
        if amount >= 0:
            inflows += amount
        else:
            outflows += amount
    net = inflows + outflows
    return (
        inflows.quantize(Decimal("0.01")),
        outflows.quantize(Decimal("0.01")),
        net.quantize(Decimal("0.01")),
    )


def _latest_price_with_meta(
    conn, ticker: str, as_of_date: date
) -> Optional[tuple[Decimal, date, Optional[str], Optional[str]]]:
    from app.repositories import prices as prices_repo

    with conn.cursor() as cur:
        price_info = prices_repo.get_latest_price_with_meta(cur, ticker, as_of_date)
    if price_info is None:
        return None
    price, price_date, sector, industry = price_info
    return Decimal(price), price_date, sector, industry


def _build_position(rows: Iterable[ActivityRow]) -> PositionState:
    lots: deque[dict] = deque()
    realized_cost_basis = Decimal("0")
    realized_proceeds = Decimal("0")
    realized_pl = Decimal("0")
    closed_quantity = Decimal("0")
    dividends_received_open = Decimal("0")
    cashflows: List[tuple[date, Decimal]] = []

    for row in rows:
        amount = _resolve_amount(row)
        qty = Decimal(row.quantity) if row.quantity not in (None, "") else None

        if row.activity_type == "buy" and qty and amount is not None:
            cost_per_share = (Decimal(amount) / qty).quantize(Decimal("0.000001"))
            lots.append({"qty": qty, "cost_per_share": cost_per_share})
            cashflows.append((row.activity_date, -abs(Decimal(amount))))
            continue

        if row.activity_type == "sell" and qty and amount is not None:
            proceeds = abs(Decimal(amount))
            proceeds_per_share = (proceeds / qty).quantize(Decimal("0.000001"))
            remaining = qty
            while remaining > 0 and lots:
                head = lots[0]
                take = min(head["qty"], remaining)
                cost = (head["cost_per_share"] * take).quantize(Decimal("0.000001"))
                realized_cost_basis += cost
                realized_pl += (proceeds_per_share - head["cost_per_share"]) * take
                head["qty"] -= take
                remaining -= take
                if head["qty"] <= 0:
                    lots.popleft()
            closed_quantity += qty
            realized_proceeds += proceeds
            cashflows.append((row.activity_date, proceeds))
            continue

        if row.activity_type == "dividend" and amount is not None:
            cashflows.append((row.activity_date, abs(Decimal(amount))))
            if _current_open_quantity(lots) > 0:
                dividends_received_open += abs(Decimal(amount))
            continue

        if row.activity_type == "fee" and amount is not None:
            cashflows.append((row.activity_date, -abs(Decimal(amount))))
            continue

        if row.activity_type == "withdrawal" and amount is not None:
            cashflows.append((row.activity_date, abs(Decimal(amount))))
            continue

        if row.activity_type == "deposit" and amount is not None:
            cashflows.append((row.activity_date, -abs(Decimal(amount))))
            continue

    open_quantity = _current_open_quantity(lots)
    open_cost_basis = sum(
        ((lot["qty"] * lot["cost_per_share"]) for lot in lots),
        Decimal("0"),
    ).quantize(Decimal("0.01"))

    return PositionState(
        open_quantity=open_quantity,
        open_cost_basis=open_cost_basis,
        closed_quantity=closed_quantity,
        realized_cost_basis=realized_cost_basis.quantize(Decimal("0.01")),
        realized_proceeds=realized_proceeds.quantize(Decimal("0.01")),
        realized_pl=realized_pl.quantize(Decimal("0.01")),
        dividends_received_open=dividends_received_open.quantize(Decimal("0.01")),
        cashflows=cashflows,
    )


def _current_open_quantity(lots: deque[dict]) -> Decimal:
    return sum((lot["qty"] for lot in lots), Decimal("0"))


def _safe_return_pct(numerator: Decimal, denominator: Decimal) -> Optional[Decimal]:
    if denominator and denominator != 0:
        return (numerator / denominator).quantize(Decimal("0.000001"))
    return None
