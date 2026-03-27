import os

import psycopg2


def get_db_conn():
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        return psycopg2.connect(db_url)

    name = os.getenv("DB_NAME")
    host = os.getenv("DB_HOST")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    port = os.getenv("DB_PORT")
    instance = os.getenv("INSTANCE_CONNECTION_NAME")

    if not host and instance:
        host = f"/cloudsql/{instance}"

    if not (name and host and user):
        raise RuntimeError("Database config missing (set DATABASE_URL or DB_USER/DB_NAME/DB_HOST)")

    return psycopg2.connect(
        dbname=name,
        host=host,
        user=user,
        password=password,
        port=port,
        sslmode=os.getenv("DB_SSLMODE", "require"),
    )
