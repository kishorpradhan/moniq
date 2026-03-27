CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
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

    UNIQUE (account_id, external_transaction_id)
);

GRANT USAGE ON SCHEMA public TO moniq_read;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO moniq_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO moniq_read;
