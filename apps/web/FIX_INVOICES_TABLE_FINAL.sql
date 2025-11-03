-- ============================================================================
-- FIX INVOICES TABLE - Final version with proper cleanup
-- ============================================================================

-- Step 1: Drop ALL existing policies on invoices table
DROP POLICY IF EXISTS "Users can view organization invoices" ON invoices;
DROP POLICY IF EXISTS "Ops/Director/Admin can manage invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON invoices;
DROP POLICY IF EXISTS "Ops/Director/Admin can manage invoices" ON invoices;

-- Step 2: Drop the organization_id column
ALTER TABLE invoices
DROP COLUMN IF EXISTS organization_id;

-- Step 3: Create the correct policies (with unique names)
DROP POLICY IF EXISTS "Allow authenticated users to view all invoices" ON invoices;
CREATE POLICY "Allow authenticated users to view all invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow ops director admin to manage invoices" ON invoices;
CREATE POLICY "Allow ops director admin to manage invoices"
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
  '✅ Checking organization_id column (should be 0):' as status,
  COUNT(*) as column_exists
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
  AND column_name = 'organization_id';

SELECT
  '✅ Current RLS Policies on invoices:' as status,
  policyname
FROM pg_policies
WHERE tablename = 'invoices';

SELECT '✅ Invoices table is now ready to use!' as final_status;
