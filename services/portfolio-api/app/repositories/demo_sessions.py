import uuid

DEMO_USER_ID = "00000000-0000-4000-8000-000000000001"
DEMO_EMAIL = "demo@moniq.chat"
DEFAULT_LLM_LIMIT = 10


def ensure_table(cur):
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS demo_sessions (
            id UUID PRIMARY KEY,
            demo_user_id TEXT NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001',
            llm_call_count INTEGER NOT NULL DEFAULT 0,
            llm_call_limit INTEGER NOT NULL DEFAULT 10,
            created_at TIMESTAMP NOT NULL DEFAULT NOW(),
            expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '1 day')
        )
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS demo_sessions_expires_at_idx
        ON demo_sessions (expires_at)
        """
    )


def ensure_demo_user(cur, demo_user_id: str = DEMO_USER_ID):
    cur.execute(
        """
        INSERT INTO users (id, firebase_uid, email)
        VALUES (%s, %s, %s)
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
        """,
        (demo_user_id, demo_user_id, DEMO_EMAIL),
    )


def create_session(cur, llm_call_limit: int = DEFAULT_LLM_LIMIT):
    ensure_table(cur)
    ensure_demo_user(cur)
    session_id = str(uuid.uuid4())
    cur.execute(
        """
        INSERT INTO demo_sessions (id, demo_user_id, llm_call_limit)
        VALUES (%s, %s, %s)
        RETURNING id, demo_user_id, llm_call_count, llm_call_limit, expires_at
        """,
        (session_id, DEMO_USER_ID, llm_call_limit),
    )
    return _row_to_session(cur.fetchone())


def get_session(cur, session_id: str):
    ensure_table(cur)
    try:
        uuid.UUID(str(session_id))
    except ValueError:
        return None
    cur.execute(
        """
        SELECT id, demo_user_id, llm_call_count, llm_call_limit, expires_at
        FROM demo_sessions
        WHERE id = %s AND expires_at > NOW()
        """,
        (session_id,),
    )
    row = cur.fetchone()
    return _row_to_session(row) if row else None


def consume_llm_call(cur, session_id: str):
    ensure_table(cur)
    try:
        uuid.UUID(str(session_id))
    except ValueError:
        return None
    cur.execute(
        """
        UPDATE demo_sessions
        SET llm_call_count = llm_call_count + 1
        WHERE id = %s
          AND expires_at > NOW()
          AND llm_call_count < llm_call_limit
        RETURNING id, demo_user_id, llm_call_count, llm_call_limit, expires_at
        """,
        (session_id,),
    )
    row = cur.fetchone()
    return _row_to_session(row) if row else None


def _row_to_session(row):
    return {
        "id": str(row[0]),
        "demoUserId": row[1],
        "llmCallCount": row[2],
        "llmCallLimit": row[3],
        "expiresAt": row[4].isoformat() if row[4] else None,
    }
