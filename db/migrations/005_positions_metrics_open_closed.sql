ALTER TABLE positions_metrics_open
    ADD COLUMN IF NOT EXISTS cost_basis DECIMAL(18,2),
    ADD COLUMN IF NOT EXISTS unrealized_pl DECIMAL(18,2),
    ADD COLUMN IF NOT EXISTS return_pct DECIMAL(18,6),
    ADD COLUMN IF NOT EXISTS dividends_received DECIMAL(18,2),
    ADD COLUMN IF NOT EXISTS contribution_pct DECIMAL(18,6);

CREATE TABLE IF NOT EXISTS positions_metrics_closed (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    ticker TEXT NOT NULL,
    as_of_date DATE NOT NULL,
    closed_quantity DECIMAL(18,6) NOT NULL,
    realized_cost_basis DECIMAL(18,2),
    realized_proceeds DECIMAL(18,2),
    realized_pl DECIMAL(18,2),
    return_pct DECIMAL(18,6),
    currency TEXT NOT NULL DEFAULT 'USD',
    calc_version TEXT NOT NULL DEFAULT 'v1',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, account_id, ticker, as_of_date)
);

CREATE TABLE IF NOT EXISTS portfolio_sector_allocations (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    account_id TEXT NOT NULL,
    as_of_date DATE NOT NULL,
    sector TEXT NOT NULL,
    market_value DECIMAL(18,2),
    contribution_pct DECIMAL(18,6),
    currency TEXT NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, account_id, sector, as_of_date)
);
