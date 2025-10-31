-- Ensure the users table has the full_name column
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Create a view to easily get user information for edit history
CREATE OR REPLACE VIEW v_user_edit_info AS
SELECT 
    id,
    full_name,
    email,
    role
FROM users;