import base64
import json
import logging

from fastapi import HTTPException

from app.ingestion.processor import process_file
from app.repositories import ingestion_runs as runs_repo


logger = logging.getLogger("ingest-worker")


async def handle_pubsub(request, conn):
    envelope = await request.json()
    if "message" not in envelope:
        raise HTTPException(status_code=400, detail="Invalid Pub/Sub message")

    message = envelope["message"]
    data = message.get("data")
    attributes = message.get("attributes", {})

    if not data:
        raise HTTPException(status_code=400, detail="Missing message data")

    decoded = base64.b64decode(data).decode("utf-8")
    payload = json.loads(decoded)

    bucket = payload.get("bucket")
    name = payload.get("name")
    generation = payload.get("generation")

    if not bucket or not name:
        raise HTTPException(status_code=400, detail="Missing bucket or name")

    logger.info(
        "pubsub_event",
        extra={"bucket": bucket, "object_name": name, "attributes": attributes},
    )

    with conn:
        with conn.cursor() as cur:
            runs_repo.ensure_table(cur)
            run_id = runs_repo.start_run(cur, bucket, name, generation)

        try:
            parsed_count, inserted_count, skipped_count, error_code = process_file(
                conn, bucket, name
            )
            error = {"code": error_code} if error_code else None
            if error_code:
                status = "failed"
            elif inserted_count == 0:
                status = "failed"
            elif skipped_count > 0:
                status = "partial"
            else:
                status = "success"
        except Exception as exc:  # noqa: BLE001 - log and rethrow for visibility
            logger.exception(
                "ingestion_failed",
                extra={"bucket": bucket, "object_name": name},
            )
            parsed_count = 0
            inserted_count = 0
            skipped_count = 0
            status = "failed"
            error = {"message": str(exc)}
            raise
        finally:
            with conn.cursor() as cur:
                runs_repo.finish_run(
                    cur,
                    run_id,
                    status,
                    parsed_count,
                    inserted_count,
                    skipped_count,
                    error,
                )

    logger.info(
        "ingestion_complete",
        extra={
            "bucket": bucket,
            "object_name": name,
            "parsed": parsed_count,
            "inserted": inserted_count,
            "skipped": skipped_count,
        },
    )

    return {"ok": True}
