import os
import psycopg2


def get_db_conn():
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
