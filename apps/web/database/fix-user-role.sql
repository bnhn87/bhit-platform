-- =====================================================
-- FIX USER ROLE - Make yourself director/admin
-- =====================================================

-- Step 1: See all users and their current roles
SELECT
  auth.users.email,
  profiles.id,
  profiles.role
FROM auth.users
LEFT JOIN profiles ON auth.users.id = profiles.id
ORDER BY auth.users.created_at;

-- Step 2: Update YOUR role to director
-- REPLACE 'your@email.com' with your actual email address
UPDATE profiles
SET role = 'director'
WHERE id = (
  SELECT id
  FROM auth.users
  WHERE email = 'your@email.com'  -- <-- CHANGE THIS TO YOUR EMAIL
);

-- Step 3: Verify the change
SELECT
  auth.users.email,
  profiles.role
FROM auth.users
JOIN profiles ON auth.users.id = profiles.id
WHERE auth.users.email = 'your@email.com';  -- <-- CHANGE THIS TO YOUR EMAIL

-- If you get "role updated successfully", you're good to go!
-- Now try saving the banner settings again.
