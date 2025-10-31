-- Add full_name column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Add a default full_name for existing users based on their email
UPDATE users 
SET full_name = COALESCE(full_name, SPLIT_PART(email, '@', 1))
WHERE full_name IS NULL AND email IS NOT NULL;

-- Add a default full_name for users without email
UPDATE users 
SET full_name = COALESCE(full_name, 'Unknown User')
WHERE full_name IS NULL;

-- Add a comment to the column for documentation
COMMENT ON COLUMN users.full_name IS 'Full name of the user';

-- Create an index for better performance when querying by full_name
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);