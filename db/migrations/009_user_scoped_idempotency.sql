ALTER TABLE activities
    DROP CONSTRAINT IF EXISTS activities_account_id_external_transaction_id_key;

ALTER TABLE activities
    DROP CONSTRAINT IF EXISTS activities_external_transaction_id_key;

ALTER TABLE activities
    ADD CONSTRAINT activities_user_id_external_transaction_id_key
    UNIQUE (user_id, external_transaction_id);
