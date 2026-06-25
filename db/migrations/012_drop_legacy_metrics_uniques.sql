ALTER TABLE positions_metrics_open
    DROP CONSTRAINT IF EXISTS positions_metrics_user_id_account_id_ticker_as_of_date_key;

ALTER TABLE positions_metrics_open
    DROP CONSTRAINT IF EXISTS positions_metrics_open_user_id_account_id_ticker_as_of_date_key;

ALTER TABLE positions_metrics_closed
    DROP CONSTRAINT IF EXISTS positions_metrics_closed_user_id_account_id_ticker_as_of_date_key;

ALTER TABLE positions_metrics_closed
    DROP CONSTRAINT IF EXISTS positions_metrics_closed_user_id_account_id_ticker_as_of_da_key;

ALTER TABLE positions_metrics_closed
    DROP CONSTRAINT IF EXISTS positions_metrics_closed_user_id_account_id_ticker_as_of_date_k;

ALTER TABLE portfolio_sector_allocations
    DROP CONSTRAINT IF EXISTS portfolio_sector_allocations_user_id_account_id_sector_as_of_date_key;

ALTER TABLE portfolio_sector_allocations
    DROP CONSTRAINT IF EXISTS portfolio_sector_allocations_user_id_account_id_sector_as_of_da_key;

ALTER TABLE portfolio_sector_allocations
    DROP CONSTRAINT IF EXISTS portfolio_sector_allocations_user_id_account_id_sector_as_of_da;
