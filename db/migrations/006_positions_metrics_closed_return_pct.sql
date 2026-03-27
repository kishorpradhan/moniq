ALTER TABLE positions_metrics_closed
    ADD COLUMN IF NOT EXISTS return_pct DECIMAL(18,6);
