import io

from app.ingestion.csv_parser import parse_csv


def test_parse_csv_headers_and_rows():
    data = "a,b\n1,2\n3,4\n"
    headers, reader = parse_csv(io.BytesIO(data.encode("utf-8")))
    assert headers == ["a", "b"]
    rows = list(reader)
    assert rows == [{"a": "1", "b": "2"}, {"a": "3", "b": "4"}]
