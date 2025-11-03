-- ============================================================================
-- FORCE SCHEMA RELOAD - Modify table to trigger PostgREST cache update
-- ============================================================================

-- Add a temporary column (this forces PostgREST to notice the table)
ALTER TABLE invoices ADD COLUMN _schema_reload_trigger TIMESTAMPTZ DEFAULT NOW();

-- Immediately drop it
ALTER TABLE invoices DROP COLUMN _schema_reload_trigger;

-- Alternative: Change table comment (also triggers reload)
COMMENT ON TABLE invoices IS 'Invoice management table - reloaded at ' || NOW()::TEXT;
COMMENT ON TABLE suppliers IS 'Supplier management table - reloaded at ' || NOW()::TEXT;

-- Send reload notifications
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
SELECT pg_notify('pgrst', 'reload schema');

-- Wait and verify
SELECT pg_sleep(2);

SELECT '✅ Schema reload triggered!' as status;
SELECT 'Wait 10 seconds then test the API' as next_step;
