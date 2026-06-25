CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    profile_type TEXT NOT NULL DEFAULT 'portfolio' CHECK (
        profile_type IN ('portfolio', 'watchlist', 'kid')
    ),
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, display_name)
);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_one_default_per_user_idx
    ON profiles (user_id)
    WHERE is_default;

CREATE INDEX IF NOT EXISTS profiles_user_id_idx
    ON profiles (user_id);

INSERT INTO profiles (user_id, display_name, profile_type, is_default)
SELECT id::text, 'My Portfolio', 'portfolio', TRUE
FROM users
ON CONFLICT (user_id, display_name) DO NOTHING;

ALTER TABLE activities
    ADD COLUMN IF NOT EXISTS profile_id UUID;

ALTER TABLE ingestion_runs
    ADD COLUMN IF NOT EXISTS profile_id UUID;

ALTER TABLE positions_metrics_open
    ADD COLUMN IF NOT EXISTS profile_id UUID;

ALTER TABLE positions_metrics_closed
    ADD COLUMN IF NOT EXISTS profile_id UUID;

ALTER TABLE portfolio_sector_allocations
    ADD COLUMN IF NOT EXISTS profile_id UUID;

UPDATE activities a
SET profile_id = p.id
FROM profiles p
WHERE a.profile_id IS NULL
  AND p.user_id = a.user_id
  AND p.is_default;

UPDATE ingestion_runs r
SET profile_id = p.id
FROM profiles p
WHERE r.profile_id IS NULL
  AND p.user_id = r.user_id
  AND p.is_default;

UPDATE positions_metrics_open m
SET profile_id = p.id
FROM profiles p
WHERE m.profile_id IS NULL
  AND p.user_id = m.user_id
  AND p.is_default;

UPDATE positions_metrics_closed m
SET profile_id = p.id
FROM profiles p
WHERE m.profile_id IS NULL
  AND p.user_id = m.user_id
  AND p.is_default;

UPDATE portfolio_sector_allocations a
SET profile_id = p.id
FROM profiles p
WHERE a.profile_id IS NULL
  AND p.user_id = a.user_id
  AND p.is_default;

CREATE INDEX IF NOT EXISTS activities_profile_id_idx
    ON activities (profile_id);

CREATE INDEX IF NOT EXISTS ingestion_runs_profile_id_idx
    ON ingestion_runs (profile_id);

CREATE INDEX IF NOT EXISTS positions_metrics_open_profile_id_idx
    ON positions_metrics_open (profile_id);

CREATE INDEX IF NOT EXISTS positions_metrics_closed_profile_id_idx
    ON positions_metrics_closed (profile_id);

CREATE INDEX IF NOT EXISTS portfolio_sector_allocations_profile_id_idx
    ON portfolio_sector_allocations (profile_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'activities_profile_id_fkey'
    ) THEN
        ALTER TABLE activities
            ADD CONSTRAINT activities_profile_id_fkey
            FOREIGN KEY (profile_id) REFERENCES profiles (id) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ingestion_runs_profile_id_fkey'
    ) THEN
        ALTER TABLE ingestion_runs
            ADD CONSTRAINT ingestion_runs_profile_id_fkey
            FOREIGN KEY (profile_id) REFERENCES profiles (id) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'positions_metrics_open_profile_id_fkey'
    ) THEN
        ALTER TABLE positions_metrics_open
            ADD CONSTRAINT positions_metrics_open_profile_id_fkey
            FOREIGN KEY (profile_id) REFERENCES profiles (id) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'positions_metrics_closed_profile_id_fkey'
    ) THEN
        ALTER TABLE positions_metrics_closed
            ADD CONSTRAINT positions_metrics_closed_profile_id_fkey
            FOREIGN KEY (profile_id) REFERENCES profiles (id) NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'portfolio_sector_allocations_profile_id_fkey'
    ) THEN
        ALTER TABLE portfolio_sector_allocations
            ADD CONSTRAINT portfolio_sector_allocations_profile_id_fkey
            FOREIGN KEY (profile_id) REFERENCES profiles (id) NOT VALID;
    END IF;
END $$;

GRANT SELECT ON profiles TO moniq_read;
