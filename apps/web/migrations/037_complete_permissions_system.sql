-- ==========================================
-- COMPLETE PERMISSIONS SYSTEM MIGRATION
-- Version: 037
-- Purpose: Comprehensive permissions system using auth.users metadata
-- Strategy: Store permissions in auth.users.user_metadata to bypass PostgREST
-- ==========================================

BEGIN;

-- ==========================================
-- PART 1: CREATE HELPER FUNCTION FOR PERMISSION DEFAULTS
-- ==========================================

-- This function returns default permissions based on role
CREATE OR REPLACE FUNCTION get_default_permissions(user_role TEXT)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN jsonb_build_object(
    'can_create_jobs', LOWER(user_role) IN ('admin', 'director', 'manager', 'installer'),
    'can_edit_jobs', LOWER(user_role) IN ('admin', 'director', 'manager', 'installer'),
    'can_delete_jobs', LOWER(user_role) IN ('admin', 'director'),
    'can_hard_delete_jobs', LOWER(user_role) IN ('admin', 'director'),
    'can_view_costs', LOWER(user_role) IN ('admin', 'director', 'manager'),
    'can_edit_costs', LOWER(user_role) IN ('admin', 'director', 'manager'),
    'can_view_invoices', LOWER(user_role) IN ('admin', 'director', 'manager'),
    'can_create_invoices', LOWER(user_role) IN ('admin', 'director', 'manager'),
    'can_edit_invoices', LOWER(user_role) IN ('admin', 'director', 'manager'),
    'can_manage_users', LOWER(user_role) IN ('admin', 'director'),
    'can_edit_org_settings', LOWER(user_role) IN ('admin', 'director'),
    'can_view_reports', true,
    'can_export_data', LOWER(user_role) IN ('admin', 'director', 'manager')
  );
END;
$$;

-- ==========================================
-- PART 2: CREATE VIEW FOR EASY PERMISSION ACCESS
-- ==========================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS user_permissions_view;

-- Create view that joins profiles with auth.users metadata
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT
  p.id,
  p.email,
  p.role,
  p.created_at,
  au.raw_user_meta_data->>'full_name' as full_name,
  au.last_sign_in_at,
  au.banned_until,
  CASE
    WHEN au.banned_until IS NOT NULL AND au.banned_until > NOW() THEN false
    ELSE true
  END as is_active,
  COALESCE(
    (au.raw_user_meta_data->'permissions')::jsonb,
    get_default_permissions(p.role)
  ) as permissions,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_create_jobs')::boolean,
           (get_default_permissions(p.role)->>'can_create_jobs')::boolean) as can_create_jobs,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_edit_jobs')::boolean,
           (get_default_permissions(p.role)->>'can_edit_jobs')::boolean) as can_edit_jobs,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_delete_jobs')::boolean,
           (get_default_permissions(p.role)->>'can_delete_jobs')::boolean) as can_delete_jobs,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_hard_delete_jobs')::boolean,
           (get_default_permissions(p.role)->>'can_hard_delete_jobs')::boolean) as can_hard_delete_jobs,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_view_costs')::boolean,
           (get_default_permissions(p.role)->>'can_view_costs')::boolean) as can_view_costs,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_edit_costs')::boolean,
           (get_default_permissions(p.role)->>'can_edit_costs')::boolean) as can_edit_costs,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_view_invoices')::boolean,
           (get_default_permissions(p.role)->>'can_view_invoices')::boolean) as can_view_invoices,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_create_invoices')::boolean,
           (get_default_permissions(p.role)->>'can_create_invoices')::boolean) as can_create_invoices,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_edit_invoices')::boolean,
           (get_default_permissions(p.role)->>'can_edit_invoices')::boolean) as can_edit_invoices,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_manage_users')::boolean,
           (get_default_permissions(p.role)->>'can_manage_users')::boolean) as can_manage_users,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_edit_org_settings')::boolean,
           (get_default_permissions(p.role)->>'can_edit_org_settings')::boolean) as can_edit_org_settings,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_view_reports')::boolean,
           (get_default_permissions(p.role)->>'can_view_reports')::boolean) as can_view_reports,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_export_data')::boolean,
           (get_default_permissions(p.role)->>'can_export_data')::boolean) as can_export_data
FROM public.profiles p
LEFT JOIN auth.users au ON au.id = p.id;

-- Grant access to the view
GRANT SELECT ON user_permissions_view TO authenticated;
GRANT SELECT ON user_permissions_view TO service_role;

-- ==========================================
-- PART 3: CREATE RLS POLICIES FOR THE VIEW
-- ==========================================

-- Enable RLS on the view (if supported, otherwise handle in application)
-- Views inherit RLS from base tables, so profiles RLS will apply

-- ==========================================
-- PART 4: CREATE STORED FUNCTION TO UPDATE PERMISSIONS
-- ==========================================

-- Function to update user permissions (callable via RPC)
CREATE OR REPLACE FUNCTION update_user_permissions_metadata(
  target_user_id UUID,
  new_permissions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  calling_user_role TEXT;
  target_user_data RECORD;
  updated_metadata JSONB;
  result JSONB;
BEGIN
  -- Get calling user's role
  SELECT role INTO calling_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  -- Check if calling user is admin or director
  IF LOWER(calling_user_role) NOT IN ('admin', 'director') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Forbidden: Admin or Director access required'
    );
  END IF;

  -- Get target user's current metadata
  SELECT raw_user_meta_data INTO updated_metadata
  FROM auth.users
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;

  -- Merge new permissions into existing metadata
  updated_metadata = COALESCE(updated_metadata, '{}'::jsonb) ||
                     jsonb_build_object('permissions', new_permissions);

  -- Update auth.users metadata
  UPDATE auth.users
  SET raw_user_meta_data = updated_metadata,
      updated_at = NOW()
  WHERE id = target_user_id;

  -- Return success with updated permissions
  RETURN jsonb_build_object(
    'success', true,
    'user_id', target_user_id,
    'permissions', new_permissions,
    'message', 'Permissions updated successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'sqlstate', SQLSTATE
    );
END;
$$;

-- Grant execute to authenticated users (function checks permissions internally)
GRANT EXECUTE ON FUNCTION update_user_permissions_metadata(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_permissions_metadata(UUID, JSONB) TO service_role;

-- ==========================================
-- PART 5: CREATE FUNCTION TO GET USER PERMISSIONS
-- ==========================================

CREATE OR REPLACE FUNCTION get_user_permissions(user_id UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_id UUID;
  user_role TEXT;
  user_permissions JSONB;
BEGIN
  -- Use provided user_id or default to calling user
  target_id = COALESCE(user_id, auth.uid());

  -- Get user's role
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = target_id;

  -- Get permissions from auth.users metadata
  SELECT raw_user_meta_data->'permissions' INTO user_permissions
  FROM auth.users
  WHERE id = target_id;

  -- If no permissions set, return defaults based on role
  IF user_permissions IS NULL OR user_permissions = 'null'::jsonb THEN
    user_permissions = get_default_permissions(user_role);
  END IF;

  RETURN user_permissions;
END;
$$;

-- Grant execute
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_permissions(UUID) TO service_role;

-- ==========================================
-- PART 6: INITIALIZE PERMISSIONS FOR ALL EXISTING USERS
-- ==========================================

-- Update all existing auth.users with default permissions based on their role
DO $$
DECLARE
  user_record RECORD;
  current_metadata JSONB;
  default_perms JSONB;
  updated_count INTEGER := 0;
BEGIN
  FOR user_record IN
    SELECT au.id, au.raw_user_meta_data, p.role
    FROM auth.users au
    JOIN public.profiles p ON p.id = au.id
  LOOP
    -- Get current metadata
    current_metadata = COALESCE(user_record.raw_user_meta_data, '{}'::jsonb);

    -- Only update if permissions not already set
    IF current_metadata->'permissions' IS NULL OR current_metadata->'permissions' = 'null'::jsonb THEN
      -- Get default permissions for user's role
      default_perms = get_default_permissions(user_record.role);

      -- Update metadata with permissions
      UPDATE auth.users
      SET raw_user_meta_data = current_metadata || jsonb_build_object('permissions', default_perms),
          updated_at = NOW()
      WHERE id = user_record.id;

      updated_count = updated_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Updated % users with default permissions', updated_count;
END $$;

-- ==========================================
-- PART 7: CREATE TRIGGER TO AUTO-SET PERMISSIONS ON USER CREATION
-- ==========================================

-- Function to set default permissions when user is created
CREATE OR REPLACE FUNCTION set_default_permissions_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_role TEXT;
  default_perms JSONB;
BEGIN
  -- Get role from profiles (should be set before or during signup)
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = NEW.id;

  -- If role exists and permissions not set, set defaults
  IF user_role IS NOT NULL THEN
    IF NEW.raw_user_meta_data->'permissions' IS NULL THEN
      default_perms = get_default_permissions(user_role);
      NEW.raw_user_meta_data = COALESCE(NEW.raw_user_meta_data, '{}'::jsonb) ||
                                jsonb_build_object('permissions', default_perms);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS set_permissions_on_user_insert ON auth.users;

-- Create trigger on auth.users insert
CREATE TRIGGER set_permissions_on_user_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION set_default_permissions_on_signup();

-- ==========================================
-- PART 8: CLEANUP OLD PERMISSIONS TABLES (OPTIONAL)
-- ==========================================

-- Comment out if you want to keep the old table for reference
-- DROP TABLE IF EXISTS public.user_permissions CASCADE;

-- ==========================================
-- PART 9: REFRESH POSTGREST SCHEMA CACHE
-- ==========================================

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Check the view works
SELECT
  'user_permissions_view' as check_name,
  COUNT(*) as total_users,
  COUNT(CASE WHEN can_manage_users THEN 1 END) as users_with_manage_permission
FROM user_permissions_view;

-- Check permissions were set
SELECT
  'auth_users_metadata' as check_name,
  COUNT(*) as users_with_permissions
FROM auth.users
WHERE raw_user_meta_data->'permissions' IS NOT NULL
  AND raw_user_meta_data->'permissions' != 'null'::jsonb;

-- Sample user permissions
SELECT
  id,
  email,
  role,
  can_manage_users,
  can_view_costs,
  can_create_jobs
FROM user_permissions_view
LIMIT 5;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✓ PERMISSIONS SYSTEM MIGRATION COMPLETE';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Created:';
  RAISE NOTICE '  • get_default_permissions(role) - Returns default permissions for a role';
  RAISE NOTICE '  • user_permissions_view - View combining profiles + auth metadata';
  RAISE NOTICE '  • update_user_permissions_metadata(user_id, permissions) - RPC to update permissions';
  RAISE NOTICE '  • get_user_permissions(user_id) - Get user permissions';
  RAISE NOTICE '  • Auto-trigger to set permissions on user creation';
  RAISE NOTICE '';
  RAISE NOTICE 'Initialized:';
  RAISE NOTICE '  • All existing users have permissions in auth.users metadata';
  RAISE NOTICE '';
  RAISE NOTICE 'Usage:';
  RAISE NOTICE '  • Frontend: Use Supabase Auth Admin API to read/write user_metadata.permissions';
  RAISE NOTICE '  • Alternative: Call update_user_permissions_metadata via RPC';
  RAISE NOTICE '  • Query: SELECT * FROM user_permissions_view WHERE id = auth.uid()';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;
