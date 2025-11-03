-- ============================================================================
-- COMPLETE DIAGNOSTIC - Find out exactly what's wrong
-- ============================================================================

-- 1. Does the invoices table exist?
SELECT
  '1. TABLE EXISTS?' as check_name,
  CASE WHEN EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'invoices'
  ) THEN '✅ YES' ELSE '❌ NO' END as result;

-- 2. What columns does it have?
SELECT
  '2. INVOICES COLUMNS' as check_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'invoices'
ORDER BY ordinal_position;

-- 3. Does the current user have SELECT permission?
SELECT
  '3. SELECT PERMISSION?' as check_name,
  has_table_privilege(current_user, 'public.invoices', 'SELECT') as can_select;

-- 4. Is RLS enabled?
SELECT
  '4. RLS STATUS' as check_name,
  relname as table_name,
  CASE WHEN relrowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as rls_enabled
FROM pg_class
WHERE relname = 'invoices'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 5. What RLS policies exist?
SELECT
  '5. RLS POLICIES' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'invoices';

-- 6. Can we actually query the table?
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM invoices;
  RAISE NOTICE '6. CAN QUERY TABLE? ✅ YES - Found % rows', row_count;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '6. CAN QUERY TABLE? ❌ NO - Error: %', SQLERRM;
END $$;

-- 7. Check postgrest role permissions
SELECT
  '7. POSTGREST ROLE' as check_name,
  current_user as current_user,
  session_user as session_user;

-- 8. Check if authenticator/anon roles can see the table
SELECT
  '8. ANON ROLE PERMISSION' as check_name,
  has_table_privilege('anon', 'public.invoices', 'SELECT') as anon_can_select,
  has_table_privilege('authenticated', 'public.invoices', 'SELECT') as auth_can_select;
