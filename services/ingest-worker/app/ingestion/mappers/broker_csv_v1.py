from datetime import datetime
from decimal import Decimal, InvalidOperation
from uuid import UUID

from .base import BaseMapper


class BrokerCsvV1Mapper(BaseMapper):
    name = "broker_csv_v1"
    required_headers = {
        "id",
        "account_id",
        "user_id",
        "symbol",
        "side",
        "quantity",
        "price",
        "created_at",
        "state",
    }

    def matches(self, headers):
        if headers is None:
            return False
        return self.required_headers.issubset({h.strip() for h in headers if h})

    def map_row(self, row: dict):
        if row is None:
            return None

        external_id = row.get("id")
        account_id = row.get("account_id")
        user_id = row.get("user_id")
        ticker = row.get("symbol")
        activity_type = row.get("side")
        quantity = row.get("quantity")
        price = row.get("price")
        activity_date = row.get("created_at")
        status = row.get("state")

        activity_id = None
        if external_id:
            try:
                activity_id = UUID(external_id)
            except ValueError:
                activity_id = None

        mapped = {
            "id": activity_id,
            "user_id": user_id,
            "account_id": account_id,
            "source_id": None,
            "external_transaction_id": external_id,
            "ticker": ticker,
            "activity_type": activity_type,
            "quantity": quantity,
            "price": price,
            "amount": _compute_amount(quantity, price),
            "currency": "USD",
            "activity_date": _parse_date(activity_date),
            "status": status,
            "description": None,
            "uploaded_file_name": None,
        }
        return mapped


def _parse_date(value):
    if not value:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    # Strip time portion if present (e.g., 2026-02-04T00:00:00Z or 2026-02-04 00:00:00)
    if "T" in raw:
        raw = raw.split("T", 1)[0]
    if " " in raw:
        raw = raw.split(" ", 1)[0]

    formats = (
        "%Y-%m-%d",
        "%m/%d/%y",
        "%m/%d/%Y",
        "%Y/%m/%d",
        "%m-%d-%Y",
        "%m-%d-%y",
    )
    for fmt in formats:
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def _compute_amount(quantity, price):
    if quantity in (None, "") or price in (None, ""):
        return None
    try:
        q = Decimal(str(quantity))
        p = Decimal(str(price))
        return (q * p).quantize(Decimal("0.01"))
    except (InvalidOperation, ValueError):
        return None
