-- Get your profile
SELECT * FROM user_profiles
WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';

-- Check users table
SELECT u.id, u.role, u.full_name, u.account_id
FROM users u
WHERE u.id IN (
  SELECT id FROM auth.users WHERE email = 'ben.hone1987@gmail.com'
);

-- Check all profiles
SELECT id, account_id, role, full_name, is_active, created_at
FROM user_profiles
ORDER BY created_at DESC
LIMIT 5;

-- Get your auth user ID
SELECT id, email FROM auth.users WHERE email = 'ben.hone1987@gmail.com';
