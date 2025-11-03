-- ============================================================================
-- FIX INVOICES TABLE - Remove organization_id with CASCADE
-- ============================================================================

-- Step 1: Drop the policies that depend on organization_id
DROP POLICY IF EXISTS "Users can view organization invoices" ON invoices;
DROP POLICY IF EXISTS "Ops/Director/Admin can manage invoices" ON invoices;

-- Step 2: Now drop the organization_id column
ALTER TABLE invoices
DROP COLUMN IF EXISTS organization_id;

-- Step 3: Recreate simpler policies that don't need organization_id
CREATE POLICY "Authenticated users can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Ops/Director/Admin can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ops', 'director', 'admin')
    )
  );

-- Step 4: Refresh schema cache
NOTIFY pgrst, 'reload schema';

-- Step 5: Verify the fix
SELECT
  '✅ Checking organization_id column:' as status,
  COUNT(*) as column_exists
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
  AND column_name = 'organization_id';

-- If result is 0, column was successfully dropped

SELECT
  '✅ RLS Policies on invoices:' as status,
  policyname
FROM pg_policies
WHERE tablename = 'invoices';

SELECT '✅ Invoices table is now ready!' as status;
