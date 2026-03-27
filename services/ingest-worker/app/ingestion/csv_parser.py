import csv
import io


def parse_csv(byte_stream):
    text_stream = io.TextIOWrapper(byte_stream, encoding="utf-8", errors="replace", newline="")
    reader = csv.DictReader(text_stream)
    headers = reader.fieldnames
    if headers is None:
        return None, None
    return headers, reader
