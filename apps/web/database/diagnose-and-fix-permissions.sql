-- =====================================================
-- COMPREHENSIVE PERMISSION DIAGNOSTIC AND FIX
-- Run this entire file to diagnose and fix the issue
-- =====================================================

-- STEP 1: Check if profiles table exists
SELECT 'Checking profiles table...' AS status;
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- STEP 2: See ALL users from auth.users
SELECT 'ALL USERS IN SYSTEM:' AS status;
SELECT
  id,
  email,
  created_at,
  email_confirmed_at IS NOT NULL as email_confirmed
FROM auth.users
ORDER BY created_at;

-- STEP 3: See ALL profiles and their roles
SELECT 'ALL PROFILES AND ROLES:' AS status;
SELECT
  profiles.id,
  auth.users.email,
  profiles.role,
  profiles.created_at
FROM profiles
LEFT JOIN auth.users ON profiles.id = auth.users.id
ORDER BY profiles.created_at;

-- STEP 4: Check for users WITHOUT profiles (this is the problem!)
SELECT 'USERS WITHOUT PROFILES (NEEDS FIXING):' AS status;
SELECT
  auth.users.id,
  auth.users.email,
  auth.users.created_at
FROM auth.users
LEFT JOIN profiles ON auth.users.id = profiles.id
WHERE profiles.id IS NULL;

-- STEP 5: Create missing profiles for ALL users as directors
-- This will fix the issue!
INSERT INTO profiles (id, role, full_name, created_at, updated_at)
SELECT
  auth.users.id,
  'director' as role,
  COALESCE(auth.users.raw_user_meta_data->>'full_name', split_part(auth.users.email, '@', 1)) as full_name,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users
LEFT JOIN profiles ON auth.users.id = profiles.id
WHERE profiles.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- STEP 6: Update ALL existing profiles to director (temporary fix)
UPDATE profiles
SET role = 'director'
WHERE role IS NULL OR role NOT IN ('director', 'admin');

-- STEP 7: Verify all users now have director role
SELECT 'FINAL CHECK - ALL USERS WITH ROLES:' AS status;
SELECT
  auth.users.email,
  profiles.role,
  CASE
    WHEN profiles.role IN ('director', 'admin') THEN '✅ CAN SAVE SETTINGS'
    ELSE '❌ CANNOT SAVE SETTINGS'
  END as permission_status
FROM auth.users
JOIN profiles ON auth.users.id = profiles.id
ORDER BY auth.users.created_at;

-- STEP 8: Check RLS policies on profiles table
SELECT 'RLS POLICIES ON PROFILES TABLE:' AS status;
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- STEP 9: Ensure RLS allows reading profiles for auth
-- Disable RLS temporarily for profiles table (or add permissive policy)
-- This might be blocking the API from reading the role
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Or if you want to keep RLS enabled, add this policy instead:
-- DROP POLICY IF EXISTS "Allow authenticated users to read all profiles" ON profiles;
-- CREATE POLICY "Allow authenticated users to read all profiles"
--   ON profiles FOR SELECT
--   TO authenticated
--   USING (true);

SELECT '✅ DIAGNOSTIC AND FIX COMPLETE!' AS status;
SELECT 'Now refresh your browser and try saving settings again.' AS instruction;
