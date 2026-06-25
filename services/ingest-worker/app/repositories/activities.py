from psycopg2.extras import execute_values


def ensure_table(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS activities (
            id UUID PRIMARY KEY,
            user_id TEXT NOT NULL,
            profile_id UUID,
            account_id TEXT NOT NULL,
            source_id TEXT,

            external_transaction_id TEXT,
            ticker TEXT,
            activity_type TEXT NOT NULL CHECK (activity_type IN (
                'buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'fee'
            )),

            quantity DECIMAL(10,2),
            price DECIMAL(10,2),
            amount DECIMAL(10,2) NOT NULL,
            currency TEXT NOT NULL DEFAULT 'USD',

            activity_date DATE NOT NULL,
            status TEXT,

            description TEXT,
            uploaded_file_name TEXT,

            created_at TIMESTAMP NOT NULL DEFAULT NOW(),

            UNIQUE (user_id, profile_id, external_transaction_id)
        )
        """
    )
    cur.execute("ALTER TABLE activities ADD COLUMN IF NOT EXISTS profile_id UUID")


def batch_upsert(cur, rows, batch_size=1000):
    if not rows:
        return 0

    columns = [
        "id",
        "user_id",
        "profile_id",
        "account_id",
        "source_id",
        "external_transaction_id",
        "ticker",
        "activity_type",
        "quantity",
        "price",
        "amount",
        "currency",
        "activity_date",
        "status",
        "description",
        "uploaded_file_name",
    ]

    values = [
        tuple(_coerce_value(row.get(col)) for col in columns)
        for row in rows
    ]

    insert_sql = f"""
        INSERT INTO activities ({", ".join(columns)}) VALUES %s
        ON CONFLICT (user_id, profile_id, external_transaction_id) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            profile_id = EXCLUDED.profile_id,
            account_id = EXCLUDED.account_id,
            source_id = EXCLUDED.source_id,
            external_transaction_id = EXCLUDED.external_transaction_id,
            ticker = EXCLUDED.ticker,
            activity_type = EXCLUDED.activity_type,
            quantity = EXCLUDED.quantity,
            price = EXCLUDED.price,
            amount = EXCLUDED.amount,
            currency = EXCLUDED.currency,
            activity_date = EXCLUDED.activity_date,
            status = EXCLUDED.status,
            description = EXCLUDED.description,
            uploaded_file_name = EXCLUDED.uploaded_file_name
    """

    total = 0
    for i in range(0, len(values), batch_size):
        chunk = values[i : i + batch_size]
        execute_values(cur, insert_sql, chunk, page_size=len(chunk))
        total += len(chunk)
    return total


def get_distinct_account_ids_for_upload(cur, user_id: str, uploaded_file_name: str, profile_id: str | None = None) -> list[str]:
    clauses = ["user_id = %s", "uploaded_file_name = %s", "account_id IS NOT NULL"]
    params = [user_id, uploaded_file_name]
    if profile_id:
        clauses.append("profile_id = %s")
        params.append(profile_id)
    cur.execute(
        f"""
        SELECT DISTINCT account_id
        FROM activities
        WHERE {' AND '.join(clauses)}
        """,
        tuple(params),
    )
    return [row[0] for row in cur.fetchall()]


def get_max_activity_date_for_upload(cur, user_id: str, uploaded_file_name: str, profile_id: str | None = None):
    clauses = ["user_id = %s", "uploaded_file_name = %s"]
    params = [user_id, uploaded_file_name]
    if profile_id:
        clauses.append("profile_id = %s")
        params.append(profile_id)
    cur.execute(
        f"""
        SELECT MAX(activity_date)
        FROM activities
        WHERE {' AND '.join(clauses)}
        """,
        tuple(params),
    )
    row = cur.fetchone()
    return row[0] if row else None


def _coerce_value(value):
    if value is None:
        return None
    return str(value) if hasattr(value, "hex") else value
