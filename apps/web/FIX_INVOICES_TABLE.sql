-- ============================================================================
-- FIX INVOICES TABLE - Remove organization_id requirement
-- ============================================================================

-- Option 1: Drop the organization_id column entirely
ALTER TABLE invoices
DROP COLUMN IF EXISTS organization_id;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the fix
SELECT
  '✅ Fixed invoices table:' as status,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
  AND column_name = 'organization_id';

-- If no results returned, organization_id column was successfully dropped

SELECT '✅ Invoices table is now ready!' as status;
