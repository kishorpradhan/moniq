import logging
from typing import List, Optional, Tuple

from app.ingestion.csv_parser import parse_csv
from app.ingestion.gcs import open_text_stream
from app.ingestion.mappers.broker_csv_v1 import BrokerCsvV1Mapper
from app.ingestion.validator import validate_activity
from app.repositories import activities as activities_repo


logger = logging.getLogger("ingest-worker")


def process_file(conn, bucket: str, name: str) -> Tuple[int, int, int, Optional[str]]:
    mapper = BrokerCsvV1Mapper()
    parsed_count = 0
    valid_rows: List[dict] = []
    skipped = 0

    with open_text_stream(bucket, name) as byte_stream:
        headers, reader = parse_csv(byte_stream)
        if headers is None:
            logger.warning(
                "csv_missing_header",
                extra={"bucket": bucket, "object_name": name},
            )
            return 0, 0, 0, "csv_missing_header"

        if not mapper.matches(headers):
            logger.info(
                "csv_headers_not_supported",
                extra={"bucket": bucket, "object_name": name},
            )
            return 0, 0, 0, "csv_headers_not_supported"

        for row in reader:
            parsed_count += 1
            mapped = mapper.map_row(row)
            if mapped:
                mapped["uploaded_file_name"] = name
            is_valid, errors = validate_activity(mapped)
            if not is_valid:
                skipped += 1
                logger.warning(
                    "row_invalid",
                    extra={
                        "bucket": bucket,
                        "object_name": name,
                        "errors": errors,
                        "row": row,
                    },
                )
                continue
            valid_rows.append(mapped)

    inserted = 0
    if valid_rows:
        with conn.cursor() as cur:
            activities_repo.ensure_table(cur)
            inserted = activities_repo.batch_upsert(cur, valid_rows)
    return parsed_count, inserted, skipped, None
