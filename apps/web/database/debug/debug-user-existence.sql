-- Check if user exists in users table
SELECT * FROM users WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';

-- Check all users to see what's there
SELECT id, full_name, role FROM users LIMIT 10;

-- Check if there's a different user ID for you
SELECT id, email FROM auth.users WHERE email LIKE '%hone%' OR email LIKE '%ben%';
