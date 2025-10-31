-- ==========================================
-- CREATE POSTGRES FUNCTION TO UPDATE PERMISSIONS
-- This bypasses PostgREST schema cache issues
-- ==========================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS update_user_permissions(UUID, JSONB);

-- Create function to update user permissions
CREATE OR REPLACE FUNCTION update_user_permissions(
  p_user_id UUID,
  p_permissions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_calling_user_role TEXT;
  v_result JSONB;
BEGIN
  -- Check if calling user is admin or director
  SELECT LOWER(role) INTO v_calling_user_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_calling_user_role NOT IN ('admin', 'director') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Forbidden: Admin or Director access required'
    );
  END IF;

  -- Ensure user_permissions table exists
  CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    can_create_jobs BOOLEAN DEFAULT true,
    can_edit_jobs BOOLEAN DEFAULT true,
    can_delete_jobs BOOLEAN DEFAULT false,
    can_view_costs BOOLEAN DEFAULT false,
    can_edit_costs BOOLEAN DEFAULT false,
    can_view_invoices BOOLEAN DEFAULT false,
    can_create_invoices BOOLEAN DEFAULT false,
    can_edit_invoices BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    can_edit_org_settings BOOLEAN DEFAULT false,
    can_view_reports BOOLEAN DEFAULT true,
    can_export_data BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Upsert permissions
  INSERT INTO public.user_permissions (
    user_id,
    can_create_jobs,
    can_edit_jobs,
    can_delete_jobs,
    can_view_costs,
    can_edit_costs,
    can_view_invoices,
    can_create_invoices,
    can_edit_invoices,
    can_manage_users,
    can_edit_org_settings,
    can_view_reports,
    can_export_data,
    updated_at
  ) VALUES (
    p_user_id,
    COALESCE((p_permissions->>'can_create_jobs')::BOOLEAN, false),
    COALESCE((p_permissions->>'can_edit_jobs')::BOOLEAN, false),
    COALESCE((p_permissions->>'can_delete_jobs')::BOOLEAN, false),
    COALESCE((p_permissions->>'can_view_costs')::BOOLEAN, false),
    COALESCE((p_permissions->>'can_edit_costs')::BOOLEAN, false),
    COALESCE((p_permissions->>'can_view_invoices')::BOOLEAN, false),
    COALESCE((p_permissions->>'can_create_invoices')::BOOLEAN, false),
    COALESCE((p_permissions->>'can_edit_invoices')::BOOLEAN, false),
    COALESCE((p_permissions->>'can_manage_users')::BOOLEAN, false),
    COALESCE((p_permissions->>'can_edit_org_settings')::BOOLEAN, false),
    COALESCE((p_permissions->>'can_view_reports')::BOOLEAN, false),
    COALESCE((p_permissions->>'can_export_data')::BOOLEAN, false),
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    can_create_jobs = EXCLUDED.can_create_jobs,
    can_edit_jobs = EXCLUDED.can_edit_jobs,
    can_delete_jobs = EXCLUDED.can_delete_jobs,
    can_view_costs = EXCLUDED.can_view_costs,
    can_edit_costs = EXCLUDED.can_edit_costs,
    can_view_invoices = EXCLUDED.can_view_invoices,
    can_create_invoices = EXCLUDED.can_create_invoices,
    can_edit_invoices = EXCLUDED.can_edit_invoices,
    can_manage_users = EXCLUDED.can_manage_users,
    can_edit_org_settings = EXCLUDED.can_edit_org_settings,
    can_view_reports = EXCLUDED.can_view_reports,
    can_export_data = EXCLUDED.can_export_data,
    updated_at = NOW()
  RETURNING jsonb_build_object(
    'user_id', user_id,
    'can_create_jobs', can_create_jobs,
    'can_edit_jobs', can_edit_jobs,
    'can_delete_jobs', can_delete_jobs,
    'can_view_costs', can_view_costs,
    'can_edit_costs', can_edit_costs,
    'can_view_invoices', can_view_invoices,
    'can_create_invoices', can_create_invoices,
    'can_edit_invoices', can_edit_invoices,
    'can_manage_users', can_manage_users,
    'can_edit_org_settings', can_edit_org_settings,
    'can_view_reports', can_view_reports,
    'can_export_data', can_export_data
  ) INTO v_result;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'permissions', v_result,
    'message', 'Permissions updated successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_user_permissions(UUID, JSONB) TO authenticated;

-- Test the function
DO $$
BEGIN
  RAISE NOTICE '✓ Function update_user_permissions created successfully';
  RAISE NOTICE 'You can now call this function via Supabase RPC';
  RAISE NOTICE 'Example: supabase.rpc(''update_user_permissions'', { p_user_id: ''...'', p_permissions: {...} })';
END $$;
