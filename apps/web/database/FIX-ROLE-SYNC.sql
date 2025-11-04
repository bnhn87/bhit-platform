-- =====================================================
-- FIX: Sync roles between users and profiles tables
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, let's see what we have
SELECT
  'users table' as source,
  id,
  email,
  role,
  lower(role) as role_lowercase
FROM users
WHERE role IS NOT NULL
ORDER BY email;

SELECT
  'profiles table' as source,
  id,
  role,
  lower(role) as role_lowercase
FROM profiles
WHERE role IS NOT NULL
ORDER BY id;

-- Find mismatches
SELECT
  u.email,
  u.role as users_role,
  p.role as profiles_role,
  CASE
    WHEN u.role IS NULL AND p.role IS NOT NULL THEN 'Missing in users'
    WHEN u.role IS NOT NULL AND p.role IS NULL THEN 'Missing in profiles'
    WHEN lower(u.role) != lower(p.role) THEN 'Mismatch'
    ELSE 'OK'
  END as status
FROM users u
FULL OUTER JOIN profiles p ON u.id = p.id
WHERE u.role IS NOT NULL OR p.role IS NOT NULL
ORDER BY u.email;

-- UNCOMMENT AND RUN THE APPROPRIATE FIX BELOW:

-- Option 1: Copy roles FROM users TO profiles (if users table is correct)
-- UPDATE profiles p
-- SET role = u.role
-- FROM users u
-- WHERE p.id = u.id AND u.role IS NOT NULL;

-- Option 2: Copy roles FROM profiles TO users (if profiles table is correct)
-- UPDATE users u
-- SET role = p.role
-- FROM profiles p
-- WHERE u.id = p.id AND p.role IS NOT NULL;

-- Option 3: Set YOUR specific role in BOTH tables (replace with your user ID)
-- UPDATE users SET role = 'director' WHERE email = 'your-email@example.com';
-- UPDATE profiles SET role = 'director' WHERE id = (SELECT id FROM users WHERE email = 'your-email@example.com');

-- After fixing, verify:
SELECT
  u.email,
  u.role as users_role,
  p.role as profiles_role,
  lower(u.role) = 'director' OR lower(u.role) = 'admin' as has_admin_access
FROM users u
LEFT JOIN profiles p ON u.id = p.id
WHERE u.email LIKE '%@%'
ORDER BY u.email;
