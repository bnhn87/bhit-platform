-- =====================================================
-- FIX: Sync roles between users and profiles tables (CORRECTED)
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, check the structure of both tables
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Check what's in users table
SELECT id, role
FROM users
LIMIT 10;

-- Check what's in profiles table
SELECT id, role
FROM profiles
LIMIT 10;

-- Find your user in auth.users (which has email)
SELECT id, email
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Check roles for your specific ID (replace YOUR_USER_ID with your actual ID from above)
-- SELECT
--   u.id,
--   u.role as users_role,
--   p.role as profiles_role
-- FROM users u
-- FULL OUTER JOIN profiles p ON u.id = p.id
-- WHERE u.id = 'YOUR_USER_ID';

-- AFTER YOU FIND YOUR USER ID, uncomment and run this (replace YOUR_USER_ID):
-- UPDATE users SET role = 'director' WHERE id = 'YOUR_USER_ID';
-- UPDATE profiles SET role = 'director' WHERE id = 'YOUR_USER_ID';

-- Quick fix: Set director role for the most recent user (if that's you)
-- UPDATE users SET role = 'director' WHERE id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1);
-- UPDATE profiles SET role = 'director' WHERE id = (SELECT id FROM auth.users ORDER BY created_at DESC LIMIT 1);
