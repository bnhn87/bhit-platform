-- FIX RLS POLICIES FOR ADMINS/DIRECTORS (ROBUST VERSION)
-- This script safely iterates through tables, checking for their existence before applying policies.
-- It grants SELECT, UPDATE, and DELETE permissions to Admins, Directors, Managers, and Ops.
-- This ensures that "404 Not Found" errors due to hidden rows are resolved for privileged users.

DO $$
DECLARE
  tables text[] := ARRAY[
    'jobs', 'projects', 'floor_components', 'floor_plans', 'queued_uploads', 'rams_docs',
    'snags', 'component_completions', 'profiles', 'job_pins', 'organizations',
    'labour_time_tracking', 'labour_availability', 'labour_budget_tracking',
    'project_labour_allocation', 'product_labour_rates', 'job_floorplans',
    'daily_progress_log', 'construction_milestones', 'product_catalogue',
    'daily_progress_reports', 'quote_shares',
    'progress_photos', 'weather_impact_log', 'invoice_schedule_items',
    'job_invoice_history', 'users' -- Will be skipped if table doesn't exist
  ];
  t text;
  relkind "char";
BEGIN
  FOREACH t IN ARRAY tables LOOP

    -- 1. Ensure relation exists and is a TABLE or PARTITIONED TABLE
    SELECT c.relkind
      INTO relkind
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = t;

    IF relkind IS NULL THEN
      RAISE NOTICE 'Skipping public.%: relation does not exist', t;
      CONTINUE;
    END IF;

    IF relkind NOT IN ('r','p') THEN
      RAISE NOTICE 'Skipping public.%: not a table (relkind=%)', t, relkind;
      CONTINUE;
    END IF;

    -- 2. Drop existing policies if present
    EXECUTE format('DROP POLICY IF EXISTS rls_admin_view_all ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS rls_admin_update_all ON public.%I;', t);
    EXECUTE format('DROP POLICY IF EXISTS rls_admin_delete_all ON public.%I;', t);

    -- 3. Create New Policies
    
    IF t = 'profiles' THEN
      -- Profiles: Special case to avoid recursion. Check `role` column on the row itself.
      
      -- SELECT
      EXECUTE '
        CREATE POLICY rls_admin_view_all ON public.profiles
        FOR SELECT TO authenticated
        USING (
          id = auth.uid()
          OR role IN (''admin'', ''director'', ''manager'', ''ops'')
        );
      ';
      
      -- UPDATE (Admins can edit other profiles)
      EXECUTE '
        CREATE POLICY rls_admin_update_all ON public.profiles
        FOR UPDATE TO authenticated
        USING (
          id = auth.uid()
          OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN (''admin'', ''director'', ''manager'', ''ops'')
        )
        WITH CHECK (
          id = auth.uid()
          OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN (''admin'', ''director'', ''manager'', ''ops'')
        );
      ';
      
      -- DELETE (Admins can delete user profiles)
      EXECUTE '
        CREATE POLICY rls_admin_delete_all ON public.profiles
        FOR DELETE TO authenticated
        USING (
          (SELECT role FROM public.profiles WHERE id = auth.uid()) IN (''admin'', ''director'', ''manager'', ''ops'')
        );
      ';

    ELSE
      -- Other Tables: Standard check against public.profiles for the current user
      
      -- SELECT
      EXECUTE format('
        CREATE POLICY rls_admin_view_all ON public.%I
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN (''admin'', ''director'', ''manager'', ''ops'')
          )
        );
      ', t);

      -- UPDATE
      EXECUTE format('
        CREATE POLICY rls_admin_update_all ON public.%I
        FOR UPDATE TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN (''admin'', ''director'', ''manager'', ''ops'')
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN (''admin'', ''director'', ''manager'', ''ops'')
          )
        );
      ', t);

      -- DELETE
      EXECUTE format('
        CREATE POLICY rls_admin_delete_all ON public.%I
        FOR DELETE TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN (''admin'', ''director'', ''manager'', ''ops'')
          )
        );
      ', t);
      
    END IF;

  END LOOP;
  
  -- Create missing index on profiles.role if needed, to speed up these checks
  IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = 'profiles' 
      AND indexname = 'idx_profiles_role'
  ) THEN
      CREATE INDEX idx_profiles_role ON public.profiles(role);
  END IF;

END $$;
