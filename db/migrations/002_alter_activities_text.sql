ALTER TABLE IF EXISTS activities
    ALTER COLUMN user_id TYPE TEXT USING user_id::text,
    ALTER COLUMN account_id TYPE TEXT USING account_id::text,
    ALTER COLUMN source_id TYPE TEXT USING source_id::text;

ALTER TABLE IF EXISTS activities
    ALTER COLUMN currency SET DEFAULT 'USD';

ALTER TABLE IF EXISTS activities
    DROP CONSTRAINT IF EXISTS activities_activity_type_check;

ALTER TABLE IF EXISTS activities
    ADD CONSTRAINT activities_activity_type_check CHECK (
        activity_type IN ('buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'fee')
    );
