from datetime import date
from decimal import Decimal

from app.metrics.portfolio_metrics import ActivityRow, _build_cashflows, _build_position, _sum_cashflows


def test_cashflows_open_position_with_terminal_value():
    rows = [
        ActivityRow("u1", "a1", "AAPL", "buy", Decimal("10"), Decimal("100"), Decimal("1000"), "USD", date(2024, 1, 1)),
        ActivityRow("u1", "a1", "AAPL", "dividend", None, None, Decimal("25"), "USD", date(2024, 6, 1)),
    ]
    flows = _build_cashflows(rows)
    inflows, outflows, net = _sum_cashflows(flows)
    assert outflows == Decimal("-1000.00")
    assert inflows == Decimal("25.00")
    assert net == Decimal("-975.00")


def test_cashflows_closed_position():
    rows = [
        ActivityRow("u1", "a1", "AAPL", "buy", Decimal("5"), Decimal("100"), Decimal("500"), "USD", date(2024, 1, 1)),
        ActivityRow("u1", "a1", "AAPL", "sell", Decimal("5"), Decimal("120"), Decimal("600"), "USD", date(2024, 2, 1)),
    ]
    flows = _build_cashflows(rows)
    inflows, outflows, net = _sum_cashflows(flows)
    assert inflows == Decimal("600.00")
    assert outflows == Decimal("-500.00")
    assert net == Decimal("100.00")


def test_cashflows_deposit_withdrawal_fee():
    rows = [
        ActivityRow("u1", "a1", "AAPL", "deposit", None, None, Decimal("1000"), "USD", date(2024, 1, 1)),
        ActivityRow("u1", "a1", "AAPL", "withdrawal", None, None, Decimal("200"), "USD", date(2024, 1, 15)),
        ActivityRow("u1", "a1", "AAPL", "fee", None, None, Decimal("5"), "USD", date(2024, 1, 20)),
    ]
    flows = _build_cashflows(rows)
    inflows, outflows, net = _sum_cashflows(flows)
    assert inflows == Decimal("200.00")
    assert outflows == Decimal("-1005.00")
    assert net == Decimal("-805.00")


def test_dividends_count_only_when_open():
    rows = [
        ActivityRow("u1", "a1", "AAPL", "dividend", None, None, Decimal("10"), "USD", date(2024, 1, 1)),
        ActivityRow("u1", "a1", "AAPL", "buy", Decimal("5"), Decimal("100"), Decimal("500"), "USD", date(2024, 1, 2)),
        ActivityRow("u1", "a1", "AAPL", "dividend", None, None, Decimal("20"), "USD", date(2024, 1, 3)),
    ]
    position = _build_position(rows)
    assert position.dividends_received_open == Decimal("20.00")
