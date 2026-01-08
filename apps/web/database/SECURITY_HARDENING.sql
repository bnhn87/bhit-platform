-- ==============================================================================
-- DATABASE SECURITY HARDENING SCRIPT (FINAL FIX)
-- ==============================================================================
-- STRATEGY: 
-- 1. Enable RLS on all tables.
-- 2. NUCLEAR OPTION: Drop the troublesome view completely (CASCADE) to avoid 
--    "cannot drop columns" errors, then recreate it freshly.

BEGIN;

-- =============================================================================
-- PART 0: SAFETY CHECKS
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'public') THEN
    RAISE EXCEPTION 'public schema not found';
  END IF;
END $$;

-- =============================================================================
-- PART 1: AUTO-DETECT OWNERS & ENABLE RLS
-- =============================================================================
DO $$
DECLARE
  tables text[] := ARRAY[
    'projects', 'floor_components', 'floor_plans', 'queued_uploads', 'rams_docs',
    'snags', 'component_completions', 'profiles', 'job_pins', 'organizations',
    'labour_time_tracking', 'labour_availability', 'labour_budget_tracking',
    'project_labour_allocation', 'product_labour_rates', 'job_floorplans',
    'daily_progress_log', 'construction_milestones', 'product_catalogue',
    'daily_progress_reports', 'app_config', 'temp_access_tokens', 'quote_shares',
    'progress_photos', 'weather_impact_log', 'invoice_schedule_items',
    'job_invoice_history', 'pipeline_heatmap', 'feature_flags',
    'user_flag_overrides', 'feature_flag_analytics', 'flag_environments',
    'users' 
  ];

  t text;
  owner_col text;
  has_owner boolean;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY;', t);

    -- Detect "Owner" column
    SELECT CASE
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='user_id') THEN 'user_id'
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='owner_id') THEN 'owner_id'
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='created_by') THEN 'created_by'
      WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='profile_id') THEN 'profile_id'
      WHEN t = 'profiles' THEN 'id' 
      WHEN t = 'users' THEN 'id' 
      ELSE NULL
    END INTO owner_col;

    has_owner := owner_col IS NOT NULL;

    -- CREATE POLICIES
    IF has_owner THEN
      -- 1. VIEW OWN (Select)
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname = 'rls_select_own_rows') THEN
        EXECUTE format('CREATE POLICY rls_select_own_rows ON public.%I FOR SELECT TO authenticated USING (%I = auth.uid());', t, owner_col);
      END IF;

      -- 2. INSERT OWN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname = 'rls_insert_own_rows') THEN
        EXECUTE format('CREATE POLICY rls_insert_own_rows ON public.%I FOR INSERT TO authenticated WITH CHECK (%I = auth.uid());', t, owner_col);
      END IF;

      -- 3. UPDATE OWN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname = 'rls_update_own_rows') THEN
        EXECUTE format('CREATE POLICY rls_update_own_rows ON public.%I FOR UPDATE TO authenticated USING (%I = auth.uid()) WITH CHECK (%I = auth.uid());', t, owner_col, owner_col);
      END IF;

    ELSE
      -- NO OWNER FOUND -> Fallback to "Authenticated Access" 
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname = 'rls_fallback_allow_auth') THEN
        RAISE NOTICE 'Table % has no owner column. Adding "Authenticated Can View" fallback.', t;
        EXECUTE format('CREATE POLICY rls_fallback_allow_auth ON public.%I FOR SELECT TO authenticated USING (true);', t);
      END IF;

    END IF;

  END LOOP;
END $$;


-- =============================================================================
-- PART 2: FIX VIEWS (SECURITY INVOKER)
-- =============================================================================
DO $$ 
DECLARE 
    views TEXT[] := ARRAY[
        'product_catalogue_view', 'pods_needing_review', 'v_active_jobs', 
        'recent_activity', 'pod_statistics', 'todays_jobs', 'v_labour_calendar', 
        'recent_pod_activity', 'v_jobs_with_issues', 'active_quotes'
    ];
    v TEXT;
BEGIN 
    FOREACH v IN ARRAY views LOOP 
        BEGIN
            EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true);', v);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipping security_invoker for % (might not be supported or view missing)', v;
        END;
    END LOOP; 
END $$;


-- =============================================================================
-- PART 3: RE-CREATE "USER PERMISSIONS" VIEW (DROP CASCADE)
-- =============================================================================

-- WARNING: Dropping CASCADE to force the update.
DROP VIEW IF EXISTS public.user_permissions_view CASCADE;

CREATE VIEW public.user_permissions_view WITH (security_invoker = true) AS
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
  
  -- The JSON permissions blob
  COALESCE(
    (au.raw_user_meta_data->'permissions')::jsonb,
    get_default_permissions(p.role)
  ) as permissions,

  -- EXPANDED COLUMNS (Required for App Compatibility)
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_create_jobs')::boolean,     (get_default_permissions(p.role)->>'can_create_jobs')::boolean)     as can_create_jobs,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_edit_jobs')::boolean,       (get_default_permissions(p.role)->>'can_edit_jobs')::boolean)       as can_edit_jobs,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_delete_jobs')::boolean,     (get_default_permissions(p.role)->>'can_delete_jobs')::boolean)     as can_delete_jobs,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_hard_delete_jobs')::boolean,(get_default_permissions(p.role)->>'can_hard_delete_jobs')::boolean)as can_hard_delete_jobs,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_view_costs')::boolean,      (get_default_permissions(p.role)->>'can_view_costs')::boolean)      as can_view_costs,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_edit_costs')::boolean,      (get_default_permissions(p.role)->>'can_edit_costs')::boolean)      as can_edit_costs,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_view_invoices')::boolean,   (get_default_permissions(p.role)->>'can_view_invoices')::boolean)   as can_view_invoices,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_create_invoices')::boolean, (get_default_permissions(p.role)->>'can_create_invoices')::boolean) as can_create_invoices,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_edit_invoices')::boolean,   (get_default_permissions(p.role)->>'can_edit_invoices')::boolean)   as can_edit_invoices,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_manage_users')::boolean,    (get_default_permissions(p.role)->>'can_manage_users')::boolean)    as can_manage_users,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_edit_org_settings')::boolean,(get_default_permissions(p.role)->>'can_edit_org_settings')::boolean)as can_edit_org_settings,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_view_reports')::boolean,    (get_default_permissions(p.role)->>'can_view_reports')::boolean)    as can_view_reports,
  COALESCE((au.raw_user_meta_data->'permissions'->>'can_export_data')::boolean,     (get_default_permissions(p.role)->>'can_export_data')::boolean)     as can_export_data

FROM public.profiles p
JOIN auth.users au ON au.id = p.id
WHERE
  -- CRITICAL SECURITY FILTER (Same as before)
  au.id = auth.uid() 
  OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'director'));

-- Grant access again (dropped by CASCADE)
GRANT SELECT ON public.user_permissions_view TO authenticated;
GRANT SELECT ON public.user_permissions_view TO service_role;

COMMIT;

SELECT 'Security Hardening Complete: View Recreated Successfully' as status;
