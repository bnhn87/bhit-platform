-- ============================================================================
-- SMARTINVOICE DIAGNOSTIC SCRIPT
-- Run this to check the current database state
-- ============================================================================

-- 1. Check if organizations table exists
SELECT 'Organizations table:' as check_name,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'organizations'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 2. Check if users table has organization_id column
SELECT 'Users.organization_id column:' as check_name,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'organization_id'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 3. Check current user's data
SELECT
  '👤 Current User:' as info,
  id,
  role,
  organization_id,
  CASE
    WHEN organization_id IS NULL THEN '❌ NO ORGANIZATION'
    ELSE '✅ Has Organization'
  END as org_status
FROM users
WHERE id = auth.uid();

-- 4. Check RLS status on users table
SELECT
  'RLS on users table:' as check_name,
  CASE WHEN relrowsecurity THEN '✅ ENABLED' ELSE '❌ DISABLED' END as status
FROM pg_class
WHERE relname = 'users' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 5. List ALL RLS policies on users table
SELECT
  '📋 RLS Policies on users:' as info,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';

-- 6. Check if invoices table exists
SELECT 'Invoices table:' as check_name,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'invoices'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 7. Check if suppliers table exists
SELECT 'Suppliers table:' as check_name,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'suppliers'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- 8. Test if current user can read from users table
DO $$
DECLARE
  test_result TEXT;
BEGIN
  BEGIN
    PERFORM id, organization_id FROM users WHERE id = auth.uid();
    test_result := '✅ CAN READ';
  EXCEPTION WHEN OTHERS THEN
    test_result := '❌ CANNOT READ: ' || SQLERRM;
  END;
  RAISE NOTICE 'Test users table read: %', test_result;
END $$;

-- 9. Check default organization exists
SELECT
  '🏢 Default Organization:' as info,
  id,
  name,
  CASE
    WHEN id = '00000000-0000-0000-0000-000000000001' THEN '✅ Correct ID'
    ELSE '❌ Wrong ID'
  END as id_status
FROM organizations
WHERE id = '00000000-0000-0000-0000-000000000001';
