import base64
import csv
import io
import json
import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from google.cloud import storage
import psycopg2
from psycopg2.extras import execute_values


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/pubsub")
async def pubsub(request: Request):
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

    if not bucket or not name:
        raise HTTPException(status_code=400, detail="Missing bucket or name")

    print("pubsub event", {"bucket": bucket, "name": name, "attributes": attributes})

    storage_client = storage.Client()
    blob = storage_client.bucket(bucket).blob(name)

    conn = _get_db_conn()
    try:
        with conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS ingested_rows (
                        id BIGSERIAL PRIMARY KEY,
                        bucket TEXT NOT NULL,
                        object_name TEXT NOT NULL,
                        row_number INTEGER NOT NULL,
                        data JSONB NOT NULL,
                        ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """
                )
                cur.execute(
                    "DELETE FROM ingested_rows WHERE bucket = %s AND object_name = %s",
                    (bucket, name),
                )

                batch = []
                row_number = 0
                batch_size = 2000
                with blob.open("rb") as blob_file:
                    text_stream = io.TextIOWrapper(
                        blob_file, encoding="utf-8", errors="replace", newline=""
                    )
                    reader = csv.DictReader(text_stream)
                    if reader.fieldnames is None:
                        raise HTTPException(status_code=400, detail="Missing CSV header")

                    for row in reader:
                        row_number += 1
                        batch.append((bucket, name, row_number, json.dumps(row)))
                        if len(batch) >= batch_size:
                            execute_values(
                                cur,
                                "INSERT INTO ingested_rows (bucket, object_name, row_number, data) VALUES %s",
                                batch,
                                page_size=batch_size,
                            )
                            batch.clear()

                    if batch:
                        execute_values(
                            cur,
                            "INSERT INTO ingested_rows (bucket, object_name, row_number, data) VALUES %s",
                            batch,
                            page_size=len(batch),
                        )
    finally:
        conn.close()

    return {"ok": True}


def _get_db_conn():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return psycopg2.connect(db_url)

    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASS") or os.getenv("DB_PASSWORD")
    name = os.getenv("DB_NAME")
    host = os.getenv("DB_HOST")
    port = os.getenv("DB_PORT", "5432")
    instance = os.getenv("INSTANCE_CONNECTION_NAME")
    if not host and instance:
        host = f"/cloudsql/{instance}"

    if not (user and name and host):
        raise RuntimeError("Database config missing (set DATABASE_URL or DB_USER/DB_NAME/DB_HOST)")

    return psycopg2.connect(
        user=user,
        password=password,
        dbname=name,
        host=host,
        port=port,
    )
