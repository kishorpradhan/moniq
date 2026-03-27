from datetime import date
from decimal import Decimal, InvalidOperation
from uuid import UUID


ALLOWED_ACTIVITY_TYPES = {"buy", "sell", "dividend", "deposit", "withdrawal", "fee"}


def validate_activity(activity: dict):
    errors = []

    _require_uuid(activity, "id", errors)
    _require_text(activity, "user_id", errors)
    _require_text(activity, "account_id", errors)

    activity_type = activity.get("activity_type")
    if activity_type not in ALLOWED_ACTIVITY_TYPES:
        errors.append("invalid activity_type")

    if activity.get("amount") is None:
        errors.append("missing amount")

    activity_date = activity.get("activity_date")
    if not isinstance(activity_date, date):
        errors.append("invalid activity_date")

    _validate_decimal(activity, "quantity", errors, optional=True)
    _validate_decimal(activity, "price", errors, optional=True)

    return len(errors) == 0, errors


def _require_uuid(activity, key, errors):
    value = activity.get(key)
    if value is None:
        errors.append(f"missing {key}")
        return
    try:
        UUID(str(value))
    except ValueError:
        errors.append(f"invalid {key}")


def _require_text(activity, key, errors):
    value = activity.get(key)
    if value is None:
        errors.append(f"missing {key}")
        return
    if str(value).strip() == "":
        errors.append(f"missing {key}")


def _validate_decimal(activity, key, errors, optional=False):
    value = activity.get(key)
    if value in (None, ""):
        if not optional:
            errors.append(f"missing {key}")
        return
    try:
        Decimal(str(value))
    except (InvalidOperation, ValueError):
        errors.append(f"invalid {key}")
