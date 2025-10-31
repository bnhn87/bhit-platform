-- ==========================================
-- UPDATE EXISTING USER PERMISSIONS
-- Version: 039
-- Purpose: Add can_hard_delete_jobs permission to existing users based on their role
-- ==========================================

BEGIN;

-- Update all existing users' permissions to include can_hard_delete_jobs
-- This uses the get_default_permissions function to ensure consistency

DO $$
DECLARE
  user_record RECORD;
  current_permissions JSONB;
  updated_permissions JSONB;
  user_role TEXT;
BEGIN
  -- Loop through all users that have a profile
  FOR user_record IN
    SELECT au.id, au.raw_user_meta_data, p.role
    FROM auth.users au
    JOIN profiles p ON p.id = au.id
  LOOP
    -- Get current permissions from user_metadata
    current_permissions := COALESCE(user_record.raw_user_meta_data->'permissions', '{}'::jsonb);

    -- Get default permissions for their role
    user_role := user_record.role;

    -- Add can_hard_delete_jobs if not present
    IF NOT (current_permissions ? 'can_hard_delete_jobs') THEN
      -- Set can_hard_delete_jobs based on role (admin/director get true)
      updated_permissions := current_permissions || jsonb_build_object(
        'can_hard_delete_jobs',
        LOWER(user_role) IN ('admin', 'director')
      );

      -- Update the user's metadata
      UPDATE auth.users
      SET raw_user_meta_data = raw_user_meta_data || jsonb_build_object('permissions', updated_permissions)
      WHERE id = user_record.id;

      RAISE NOTICE 'Updated permissions for user % (role: %)', user_record.id, user_role;
    END IF;
  END LOOP;

  RAISE NOTICE 'Completed updating existing user permissions';
END;
$$;

COMMIT;
