from datetime import date
from decimal import Decimal

from app.metrics.xirr import compute_xirr


def test_xirr_simple():
    flows = [
        (date(2024, 1, 1), Decimal("-1000")),
        (date(2025, 1, 1), Decimal("1100")),
    ]
    result = compute_xirr(flows)
    assert result is not None
    assert result > Decimal("0.05")


def test_xirr_invalid_mix():
    flows = [
        (date(2024, 1, 1), Decimal("-1000")),
        (date(2024, 6, 1), Decimal("-200")),
    ]
    assert compute_xirr(flows) is None
