from __future__ import annotations

from datetime import date
from decimal import Decimal, InvalidOperation
from typing import Iterable, Optional, Tuple


def compute_xirr(
    cashflows: Iterable[Tuple[date, Decimal]],
    guess: Decimal = Decimal("0.1"),
) -> Optional[Decimal]:
    flows = list(cashflows)
    if not flows:
        return None

    has_pos = any(amount > 0 for _, amount in flows)
    has_neg = any(amount < 0 for _, amount in flows)
    if not (has_pos and has_neg):
        return None

    try:
        start_date = min(d for d, _ in flows)
    except ValueError:
        return None

    def npv(rate: Decimal) -> Decimal:
        total = Decimal("0")
        for d, amount in flows:
            years = Decimal((d - start_date).days) / Decimal("365.0")
            denom = (Decimal("1") + rate) ** years
            total += amount / denom
        return total

    def d_npv(rate: Decimal) -> Decimal:
        total = Decimal("0")
        for d, amount in flows:
            years = Decimal((d - start_date).days) / Decimal("365.0")
            if years == 0:
                continue
            denom = (Decimal("1") + rate) ** (years + 1)
            total -= (years * amount) / denom
        return total

    rate = guess
    for _ in range(50):
        value = npv(rate)
        if abs(value) < Decimal("0.000001"):
            return _safe_rate(rate)
        deriv = d_npv(rate)
        if deriv == 0:
            break
        rate = rate - (value / deriv)
        if rate <= Decimal("-0.999999"):
            break

    # Bisection fallback between -0.9 and 10
    low = Decimal("-0.9")
    high = Decimal("10")
    low_val = npv(low)
    high_val = npv(high)
    if low_val == 0:
        return _safe_rate(low)
    if high_val == 0:
        return _safe_rate(high)
    if (low_val > 0 and high_val > 0) or (low_val < 0 and high_val < 0):
        return None

    for _ in range(100):
        mid = (low + high) / 2
        mid_val = npv(mid)
        if abs(mid_val) < Decimal("0.000001"):
            return _safe_rate(mid)
        if (low_val > 0 and mid_val > 0) or (low_val < 0 and mid_val < 0):
            low = mid
            low_val = mid_val
        else:
            high = mid
            high_val = mid_val

    return _safe_rate((low + high) / 2)


def _safe_rate(value: Decimal) -> Optional[Decimal]:
    try:
        return value.quantize(Decimal("0.000001"))
    except (InvalidOperation, ValueError):
        return None
