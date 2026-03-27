from datetime import date
from decimal import Decimal

from app.metrics.portfolio_metrics import ActivityRow, _build_position, _safe_return_pct


def test_fifo_open_quantity_and_realized_pl():
    rows = [
        ActivityRow("u1", "a1", "AAPL", "buy", Decimal("10"), Decimal("100"), Decimal("1000"), "USD", date(2024, 1, 1)),
        ActivityRow("u1", "a1", "AAPL", "sell", Decimal("4"), Decimal("120"), Decimal("480"), "USD", date(2024, 2, 1)),
    ]
    position = _build_position(rows)
    assert position.open_quantity == Decimal("6")
    assert position.closed_quantity == Decimal("4")
    assert position.realized_pl == Decimal("80.00")


def test_fifo_closed_position_realized_pl():
    rows = [
        ActivityRow("u1", "a1", "AAPL", "buy", Decimal("5"), Decimal("100"), Decimal("500"), "USD", date(2024, 1, 1)),
        ActivityRow("u1", "a1", "AAPL", "sell", Decimal("5"), Decimal("120"), Decimal("600"), "USD", date(2024, 2, 1)),
    ]
    position = _build_position(rows)
    assert position.open_quantity == Decimal("0")
    assert position.closed_quantity == Decimal("5")
    assert position.realized_pl == Decimal("100.00")
    assert _safe_return_pct(position.realized_pl, position.realized_cost_basis) == Decimal("0.200000")
