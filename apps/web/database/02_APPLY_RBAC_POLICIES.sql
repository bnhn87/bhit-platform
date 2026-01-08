-- =============================================================================
-- 02_APPLY_RBAC_POLICIES.sql (FIXED + ENFORCED)
-- - Profiles: SELECT = self only (enforced even if other policies exist)
-- - Tables: privileged SELECT; UPDATE restricted to admin/ops/director/gm; DELETE restricted to director/gm
-- =============================================================================
BEGIN;

DO $$
DECLARE
  tables text[] := ARRAY[
    'jobs', 'projects', 'floor_components', 'floor_plans', 'queued_uploads', 'rams_docs',
    'snags', 'component_completions', 'job_pins', 'organizations',
    'labour_time_tracking', 'labour_availability', 'labour_budget_tracking',
    'project_labour_allocation', 'product_labour_rates', 'job_floorplans',
    'daily_progress_log', 'construction_milestones', 'product_catalogue',
    'daily_progress_reports', 'quote_shares',
    'progress_photos', 'weather_impact_log', 'invoice_schedule_items',
    'job_invoice_history',
    -- Added dependencies for views:
    'clients', 'job_costs', 'job_risk_flags', 'job_tasks', 'job_documents',
    'job_photos', 'job_notes', 'job_items', 'job_drawings'
  ];
  t text;
  relkind "char";
BEGIN
  FOREACH t IN ARRAY tables LOOP
    SELECT c.relkind
      INTO relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = t;

    IF relkind IN ('r','p') THEN
      -- Ensure RLS is enabled
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);

      -- Drop only the policies we manage
      EXECUTE format('DROP POLICY IF EXISTS rls_privileged_select ON public.%I;', t);
      EXECUTE format('DROP POLICY IF EXISTS rls_privileged_update ON public.%I;', t);
      EXECUTE format('DROP POLICY IF EXISTS rls_privileged_delete ON public.%I;', t);
      EXECUTE format('DROP POLICY IF EXISTS rls_enforce_privileged_update ON public.%I;', t);
      EXECUTE format('DROP POLICY IF EXISTS rls_enforce_privileged_delete ON public.%I;', t);

      -- SELECT: privileged read
      EXECUTE format($pol$
        CREATE POLICY rls_privileged_select ON public.%I
        FOR SELECT TO authenticated
        USING (public.is_privileged_read());
      $pol$, t);

      -- UPDATE: allowed roles (permissive)
      EXECUTE format($pol$
        CREATE POLICY rls_privileged_update ON public.%I
        FOR UPDATE TO authenticated
        USING (public.is_role(ARRAY['admin','ops','director','general_manager']))
        WITH CHECK (public.is_role(ARRAY['admin','ops','director','general_manager']));
      $pol$, t);

      -- UPDATE: enforced restriction (restrictive) so other permissive policies can't widen access
      EXECUTE format($pol$
        CREATE POLICY rls_enforce_privileged_update ON public.%I
        AS RESTRICTIVE
        FOR UPDATE TO authenticated
        USING (public.is_role(ARRAY['admin','ops','director','general_manager']))
        WITH CHECK (public.is_role(ARRAY['admin','ops','director','general_manager']));
      $pol$, t);

      -- DELETE: hard delete only (permissive)
      EXECUTE format($pol$
        CREATE POLICY rls_privileged_delete ON public.%I
        FOR DELETE TO authenticated
        USING (public.is_hard_delete_role());
      $pol$, t);

      -- DELETE: enforced restriction (restrictive)
      EXECUTE format($pol$
        CREATE POLICY rls_enforce_privileged_delete ON public.%I
        AS RESTRICTIVE
        FOR DELETE TO authenticated
        USING (public.is_hard_delete_role());
      $pol$, t);

      RAISE NOTICE 'Applied RBAC policies to public.%', t;
    ELSE
      RAISE NOTICE 'Skipping public.% (missing or not a table)', t;
    END IF;
  END LOOP;

  -- ---------------------------------------------------------------------------
  -- PROFILES: self-only SELECT (no directory / no privileged browsing)
  -- Also blocks self-role escalation (role is immutable for self-updates)
  -- ---------------------------------------------------------------------------

  -- Ensure RLS enabled
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

  -- SELECT: self-only (restrictive enforcement)
  EXECUTE $pol$
    CREATE POLICY rls_profiles_select_self_enforce ON public.profiles
    AS RESTRICTIVE
    FOR SELECT TO authenticated
    USING (id = auth.uid());
  $pol$;

  -- UPDATE: self OR privileged (permissive)
  -- - self: role must not change
  -- - privileged: admin/ops/director/gm can update any profile (including role)
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

  -- UPDATE: enforce constraints even if other policies exist (restrictive)
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

  -- DELETE: blocked operationally (restrictive FALSE) even if other permissive policies exist
  EXECUTE $pol$
    CREATE POLICY rls_profiles_delete_block ON public.profiles
    AS RESTRICTIVE
    FOR DELETE TO authenticated
    USING (false);
  $pol$;

END $$;

COMMIT;
