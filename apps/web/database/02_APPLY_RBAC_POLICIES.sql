-- =============================================================================
-- RBAC + RLS ENFORCEMENT (FIXED) - SUPABASE
-- =============================================================================
BEGIN;

-- -----------------------------------------------------------------------------
-- Helpers required by the policies
-- -----------------------------------------------------------------------------

-- Returns caller's current role from profiles (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;
$$;

-- NOTE: assumes these exist already (from your 01_RBAC_FUNCTIONS.sql):
-- public.is_role(text[])
-- public.is_privileged_read()
-- public.is_hard_delete_role()

-- -----------------------------------------------------------------------------
-- 02_APPLY_RBAC_POLICIES.sql (FIXED + ENFORCED)
-- -----------------------------------------------------------------------------
DO $$
  -- 1. OPERATIONAL TABLES (Visible to all authenticated users for READ, Restricted for WRITE)
  operational_tables text[] := ARRAY[
    'jobs', 'projects', 'floor_components', 'floor_plans', 'queued_uploads', 'rams_docs',
    'snags', 'component_completions', 'job_pins', 'organizations',
    'labour_time_tracking', 'labour_availability', 'project_labour_allocation',
    'job_floorplans', 'daily_progress_log', 'construction_milestones', 'product_catalogue',
    'daily_progress_reports', 'progress_photos', 'weather_impact_log',
    'clients', 'job_risk_flags', 'job_tasks', 'job_documents',
    'job_photos', 'job_notes', 'job_items', 'job_drawings'
  ];

  -- 2. SENSITIVE TABLES (Restricted READ and WRITE)
  sensitive_tables text[] := ARRAY[
    'labour_budget_tracking', 'product_labour_rates', 'quote_shares',
    'invoice_schedule_items', 'job_invoice_history', 'job_costs'
  ];

  t text;
  relkind "char";
BEGIN

  -- PROCESS OPERATIONAL TABLES
  FOREACH t IN ARRAY operational_tables LOOP
    SELECT c.relkind INTO relkind
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = t;

    IF relkind IN ('r','p') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      
      -- Cleanup old policies
      EXECUTE format('DROP POLICY IF EXISTS rls_privileged_select ON public.%I;', t);
      EXECUTE format('DROP POLICY IF EXISTS rls_operational_select ON public.%I;', t); -- New name
      EXECUTE format('DROP POLICY IF EXISTS rls_privileged_update ON public.%I;', t);
      EXECUTE format('DROP POLICY IF EXISTS rls_privileged_delete ON public.%I;', t);
      EXECUTE format('DROP POLICY IF EXISTS rls_enforce_privileged_update ON public.%I;', t);
      EXECUTE format('DROP POLICY IF EXISTS rls_enforce_privileged_delete ON public.%I;', t);

      -- SELECT: Open to all authenticated (Installers need to see jobs/plans)
      EXECUTE format($pol$
        CREATE POLICY rls_operational_select ON public.%I
        FOR SELECT TO authenticated
        USING (true);
      $pol$, t);

      -- UPDATE: Privileged (Permissive)
      EXECUTE format($pol$
        CREATE POLICY rls_privileged_update ON public.%I
        FOR UPDATE TO authenticated
        USING (public.is_role(ARRAY['admin','ops','director','general_manager']))
        WITH CHECK (public.is_role(ARRAY['admin','ops','director','general_manager']));
      $pol$, t);

      -- DELETE: Hard Delete Role (Permissive)
      EXECUTE format($pol$
        CREATE POLICY rls_privileged_delete ON public.%I
        FOR DELETE TO authenticated
        USING (public.is_hard_delete_role());
      $pol$, t);

      -- DELETE: Hard Delete Role (Restrictive)
      EXECUTE format($pol$
        CREATE POLICY rls_enforce_privileged_delete ON public.%I
        AS RESTRICTIVE
        FOR DELETE TO authenticated
        USING (public.is_hard_delete_role());
      $pol$, t);

      RAISE NOTICE 'Applied OPERATIONAL RBAC policies to public.%', t;
    END IF;
  END LOOP;

  -- PROCESS SENSITIVE TABLES
  FOREACH t IN ARRAY sensitive_tables LOOP
    SELECT c.relkind INTO relkind
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = t;

    IF relkind IN ('r','p') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

      -- Cleanup
      EXECUTE format('DROP POLICY IF EXISTS rls_privileged_select ON public.%I;', t);
      EXECUTE format('DROP POLICY IF EXISTS rls_operational_select ON public.%I;', t);
      EXECUTE format('DROP POLICY IF EXISTS rls_privileged_update ON public.%I;', t);
      EXECUTE format('DROP POLICY IF EXISTS rls_privileged_delete ON public.%I;', t);
      EXECUTE format('DROP POLICY IF EXISTS rls_enforce_privileged_update ON public.%I;', t);
      EXECUTE format('DROP POLICY IF EXISTS rls_enforce_privileged_delete ON public.%I;', t);

      -- SELECT: Privileged Read Only
      EXECUTE format($pol$
        CREATE POLICY rls_privileged_select ON public.%I
        FOR SELECT TO authenticated
        USING (public.is_privileged_read());
      $pol$, t);

      -- UPDATE: Privileged
      EXECUTE format($pol$
        CREATE POLICY rls_privileged_update ON public.%I
        FOR UPDATE TO authenticated
        USING (public.is_role(ARRAY['admin','ops','director','general_manager']))
        WITH CHECK (public.is_role(ARRAY['admin','ops','director','general_manager']));
      $pol$, t);

      -- DELETE: Hard Delete Role
      EXECUTE format($pol$
        CREATE POLICY rls_privileged_delete ON public.%I
        FOR DELETE TO authenticated
        USING (public.is_hard_delete_role());
      $pol$, t);

      -- DELETE: Hard Delete Role (Restrictive)
      EXECUTE format($pol$
        CREATE POLICY rls_enforce_privileged_delete ON public.%I
        AS RESTRICTIVE
        FOR DELETE TO authenticated
        USING (public.is_hard_delete_role());
      $pol$, t);

      RAISE NOTICE 'Applied SENSITIVE RBAC policies to public.%', t;
    END IF;
  END LOOP;

  -- ---------------------------------------------------------------------------
  -- PROFILES: self-only SELECT (enforced), self-update allowed but cannot change
  -- role; privileged roles can update any profile; DELETE blocked
  -- ---------------------------------------------------------------------------

  EXECUTE 'ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;';

  -- Drop policies we manage (plus legacy names)
  EXECUTE 'DROP POLICY IF EXISTS rls_privileged_select ON public.profiles;';
  EXECUTE 'DROP POLICY IF EXISTS rls_privileged_update ON public.profiles;';
  EXECUTE 'DROP POLICY IF EXISTS rls_privileged_delete ON public.profiles;';

  EXECUTE 'DROP POLICY IF EXISTS rls_profiles_select_self ON public.profiles;';
  EXECUTE 'DROP POLICY IF EXISTS rls_profiles_select_self_enforce ON public.profiles;';
  EXECUTE 'DROP POLICY IF EXISTS rls_profiles_update ON public.profiles;';
  EXECUTE 'DROP POLICY IF EXISTS rls_profiles_update_enforce ON public.profiles;';
  EXECUTE 'DROP POLICY IF EXISTS rls_profiles_delete_block ON public.profiles;';

  -- SELECT: self-only (permissive)
  EXECUTE $pol$
    CREATE POLICY rls_profiles_select_self ON public.profiles
    FOR SELECT TO authenticated
    USING (id = auth.uid());
  $pol$;

  -- SELECT: self-only (restrictive)
  EXECUTE $pol$
    CREATE POLICY rls_profiles_select_self_enforce ON public.profiles
    AS RESTRICTIVE
    FOR SELECT TO authenticated
    USING (id = auth.uid());
  $pol$;

  -- UPDATE: self OR privileged (permissive)
  -- - self: cannot change role (new.role must equal current role)
  -- - privileged: admin/ops/director/gm can update any profile including role
  EXECUTE $pol$
    CREATE POLICY rls_profiles_update ON public.profiles
    FOR UPDATE TO authenticated
    USING (
      id = auth.uid()
      OR public.is_role(ARRAY['admin','ops','director','general_manager'])
    )
    WITH CHECK (
      (id = auth.uid() AND role = public.my_role())
      OR public.is_role(ARRAY['admin','ops','director','general_manager'])
    );
  $pol$;

  -- UPDATE: enforce (restrictive)
  EXECUTE $pol$
    CREATE POLICY rls_profiles_update_enforce ON public.profiles
    AS RESTRICTIVE
    FOR UPDATE TO authenticated
    USING (
      id = auth.uid()
      OR public.is_role(ARRAY['admin','ops','director','general_manager'])
    )
    WITH CHECK (
      (id = auth.uid() AND role = public.my_role())
      OR public.is_role(ARRAY['admin','ops','director','general_manager'])
    );
  $pol$;

  -- DELETE: blocked (restrictive false)
  EXECUTE $pol$
    CREATE POLICY rls_profiles_delete_block ON public.profiles
    AS RESTRICTIVE
    FOR DELETE TO authenticated
    USING (false);
  $pol$;

END $$;

COMMIT;
