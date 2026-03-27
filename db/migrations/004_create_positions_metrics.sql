CREATE TABLE IF NOT EXISTS positions_metrics (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    ticker TEXT NOT NULL,
    as_of_date DATE NOT NULL,

    position_status TEXT NOT NULL CHECK (position_status IN ('open', 'closed')),
    quantity DECIMAL(18,6) NOT NULL,
    market_value DECIMAL(18,2),

    xirr DECIMAL(18,6),
    total_inflows DECIMAL(18,2),
    total_outflows DECIMAL(18,2),
    net_cash_flow DECIMAL(18,2),

    currency TEXT NOT NULL DEFAULT 'USD',
    calc_version TEXT NOT NULL DEFAULT 'v1',

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, account_id, ticker, as_of_date)
);
