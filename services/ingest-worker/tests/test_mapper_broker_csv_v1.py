from app.ingestion.mappers.broker_csv_v1 import BrokerCsvV1Mapper


def test_mapper_matches_required_headers():
    mapper = BrokerCsvV1Mapper()
    headers = [
        "id",
        "account_id",
        "user_id",
        "symbol",
        "side",
        "quantity",
        "price",
        "created_at",
        "state",
    ]
    assert mapper.matches(headers) is True


def test_mapper_maps_row():
    mapper = BrokerCsvV1Mapper()
    row = {
        "id": "69838bec-8e03-41b5-a55e-8332917a5b27",
        "account_id": "10ecd526-3b1c-44f0-9de8-b5d13207462b",
        "user_id": "10ecd526-3b1c-44f0-9de8-b5d13207462b",
        "symbol": "GOOGL",
        "side": "buy",
        "quantity": "7.0",
        "price": "330.78",
        "created_at": "2026-02-04",
        "state": "filled",
    }
    mapped = mapper.map_row(row)
    assert mapped["external_transaction_id"] == row["id"]
    assert mapped["ticker"] == "GOOGL"
    assert mapped["activity_type"] == "buy"
    assert mapped["activity_date"].isoformat() == "2026-02-04"
    assert str(mapped["amount"]) == "2315.46"
    assert mapped["currency"] == "USD"


def test_mapper_accepts_slash_date():
    mapper = BrokerCsvV1Mapper()
    row = {
        "id": "69838bec-8e03-41b5-a55e-8332917a5b27",
        "account_id": "10ecd526-3b1c-44f0-9de8-b5d13207462b",
        "user_id": "10ecd526-3b1c-44f0-9de8-b5d13207462b",
        "symbol": "GOOGL",
        "side": "buy",
        "quantity": "7.0",
        "price": "330.78",
        "created_at": "2/4/26",
        "state": "filled",
    }
    mapped = mapper.map_row(row)
    assert mapped["activity_date"].isoformat() == "2026-02-04"
