CREATE TABLE IF NOT EXISTS demo_sessions (
    id UUID PRIMARY KEY,
    demo_user_id TEXT NOT NULL DEFAULT '00000000-0000-4000-8000-000000000001',
    llm_call_count INTEGER NOT NULL DEFAULT 0,
    llm_call_limit INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '1 day')
);

CREATE INDEX IF NOT EXISTS demo_sessions_expires_at_idx
    ON demo_sessions (expires_at);
