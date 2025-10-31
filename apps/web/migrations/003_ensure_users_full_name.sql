-- Add full_name column to users table if it doesn't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Add a comment to the column for documentation
COMMENT ON COLUMN users.full_name IS 'Full name of the user';

-- Update existing users with a default full_name based on their email if missing
UPDATE users 
SET full_name = SPLIT_PART(email, '@', 1) 
WHERE full_name IS NULL AND email IS NOT NULL;