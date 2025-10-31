-- Check current constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
  AND contype = 'c';

-- Drop the existing constraint
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- Add the correct constraint with 'director' included
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check
CHECK (role = ANY (ARRAY['admin'::text, 'director'::text, 'manager'::text, 'installer'::text, 'user'::text]));

-- Verify it was created
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'user_profiles'::regclass
  AND contype = 'c';
