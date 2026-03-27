from datetime import date

from app.ingestion.validator import validate_activity


def test_validate_activity_success():
    activity = {
        "id": "69838bec-8e03-41b5-a55e-8332917a5b27",
        "user_id": "10ecd526-3b1c-44f0-9de8-b5d13207462b",
        "account_id": "10ecd526-3b1c-44f0-9de8-b5d13207462b",
        "activity_type": "buy",
        "quantity": "7.0",
        "price": "330.78",
        "amount": "2315.46",
        "activity_date": date(2026, 2, 4),
    }
    ok, errors = validate_activity(activity)
    assert ok is True
    assert errors == []


def test_validate_activity_invalid_type():
    activity = {
        "id": "69838bec-8e03-41b5-a55e-8332917a5b27",
        "user_id": "10ecd526-3b1c-44f0-9de8-b5d13207462b",
        "account_id": "10ecd526-3b1c-44f0-9de8-b5d13207462b",
        "activity_type": "unknown",
        "quantity": "7.0",
        "price": "330.78",
        "amount": "2315.46",
        "activity_date": date(2026, 2, 4),
    }
    ok, errors = validate_activity(activity)
    assert ok is False
    assert "invalid activity_type" in errors
