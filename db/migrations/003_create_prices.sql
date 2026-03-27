CREATE TABLE IF NOT EXISTS prices (
    ticker TEXT NOT NULL,
    price_date DATE NOT NULL,
    close_price DECIMAL(10,2) NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    pe_ratio DECIMAL(10,2),
    marketcap NUMERIC(20,2),
    industry TEXT,
    sector TEXT,
    indices TEXT,
    UNIQUE (ticker, price_date)
);

GRANT USAGE ON SCHEMA public TO moniq_read;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO moniq_read;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO moniq_read;
