ALTER TABLE activities
    DROP CONSTRAINT IF EXISTS activities_user_id_external_transaction_id_key;

ALTER TABLE activities
    DROP CONSTRAINT IF EXISTS activities_account_id_external_transaction_id_key;

ALTER TABLE activities
    DROP CONSTRAINT IF EXISTS activities_external_transaction_id_key;

ALTER TABLE activities
    DROP CONSTRAINT IF EXISTS activities_user_profile_external_transaction_id_key;

ALTER TABLE activities
    ADD CONSTRAINT activities_user_profile_external_transaction_id_key
    UNIQUE (user_id, profile_id, external_transaction_id);

ALTER TABLE positions_metrics_open
    DROP CONSTRAINT IF EXISTS positions_metrics_user_id_account_id_ticker_as_of_date_key;

ALTER TABLE positions_metrics_open
    DROP CONSTRAINT IF EXISTS positions_metrics_open_user_id_account_id_ticker_as_of_date_key;

ALTER TABLE positions_metrics_open
    DROP CONSTRAINT IF EXISTS positions_metrics_open_user_profile_account_ticker_date_key;

ALTER TABLE positions_metrics_open
    ADD CONSTRAINT positions_metrics_open_user_profile_account_ticker_date_key
    UNIQUE (user_id, profile_id, account_id, ticker, as_of_date);

ALTER TABLE positions_metrics_closed
    DROP CONSTRAINT IF EXISTS positions_metrics_closed_user_id_account_id_ticker_as_of_date_key;

ALTER TABLE positions_metrics_closed
    DROP CONSTRAINT IF EXISTS positions_metrics_closed_user_profile_account_ticker_date_key;

ALTER TABLE positions_metrics_closed
    ADD CONSTRAINT positions_metrics_closed_user_profile_account_ticker_date_key
    UNIQUE (user_id, profile_id, account_id, ticker, as_of_date);

ALTER TABLE portfolio_sector_allocations
    DROP CONSTRAINT IF EXISTS portfolio_sector_allocations_user_id_account_id_sector_as_of_date_key;

ALTER TABLE portfolio_sector_allocations
    DROP CONSTRAINT IF EXISTS portfolio_sector_allocations_user_profile_account_sector_date_key;

ALTER TABLE portfolio_sector_allocations
    ADD CONSTRAINT portfolio_sector_allocations_user_profile_account_sector_date_key
    UNIQUE (user_id, profile_id, account_id, sector, as_of_date);
