from psycopg2.extras import Json


def ensure_table(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS ingestion_runs (
            id BIGSERIAL PRIMARY KEY,
            bucket TEXT NOT NULL,
            object_name TEXT NOT NULL,
            generation TEXT,
            status TEXT NOT NULL,
            started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            finished_at TIMESTAMPTZ,
            row_count INTEGER,
            inserted_count INTEGER,
            skipped_count INTEGER,
            error JSONB
        )
        """
    )


def start_run(cur, bucket, object_name, generation):
    cur.execute(
        """
        INSERT INTO ingestion_runs (bucket, object_name, generation, status)
        VALUES (%s, %s, %s, 'started')
        RETURNING id
        """,
        (bucket, object_name, generation),
    )
    return cur.fetchone()[0]


def finish_run(cur, run_id, status, row_count, inserted_count, skipped_count, error=None):
    cur.execute(
        """
        UPDATE ingestion_runs
        SET status = %s,
            finished_at = NOW(),
            row_count = %s,
            inserted_count = %s,
            skipped_count = %s,
            error = %s
        WHERE id = %s
        """,
        (status, row_count, inserted_count, skipped_count, Json(error) if error else None, run_id),
    )
