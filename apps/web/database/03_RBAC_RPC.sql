-- =============================================================================
-- 03_RBAC_RPC.sql (FIXED + HARDENED)
-- - Enforces schema=public, relkind=(r|p), allowlists
-- - Validates id column exists + is uuid
-- - Validates deleted_at exists (archive/restore) and is timestamp type
-- - Rowcount checks for not found / no-op
-- - EXECUTE locked down (revoke PUBLIC)
-- =============================================================================
BEGIN;

-- Archive (soft delete): sets deleted_at = now()
CREATE OR REPLACE FUNCTION public.archive_row(_table regclass, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE
  allowed_tables text[] := ARRAY[
    'jobs','projects','floor_components','floor_plans','queued_uploads',
    'rams_docs','snags','component_completions','job_pins','organizations',
    'labour_time_tracking','labour_availability','labour_budget_tracking',
    'project_labour_allocation','product_labour_rates','job_floorplans',
    'daily_progress_log','construction_milestones','product_catalogue',
    'daily_progress_reports','quote_shares','progress_photos','weather_impact_log',
    'invoice_schedule_items','job_invoice_history'
  ];
  _schema text;
  _relname text;
  _relkind "char";
  has_id_uuid boolean;
  has_deleted_at boolean;
  sql text;
  affected int;
BEGIN
  IF _table IS NULL OR _id IS NULL THEN
    RAISE EXCEPTION 'Invalid input (table and id are required)';
  END IF;

  IF NOT public.is_soft_delete_role() AND NOT public.is_hard_delete_role() THEN
    RAISE EXCEPTION 'Not allowed: Insufficient permissions to archive.';
  END IF;

  SELECT n.nspname, c.relname, c.relkind
    INTO _schema, _relname, _relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.oid = _table;

  IF _schema IS NULL THEN
    RAISE EXCEPTION 'Table not found';
  END IF;

  IF _schema <> 'public' THEN
    RAISE EXCEPTION 'Only public tables are supported';
  END IF;

  IF _relkind NOT IN ('r','p') THEN
    RAISE EXCEPTION 'Only tables are supported';
  END IF;

  IF NOT (_relname = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'Table % is not allowed for archive_row', _relname;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = _relname
      AND column_name = 'id'
      AND udt_name = 'uuid'
  ) INTO has_id_uuid;

  IF NOT has_id_uuid THEN
    RAISE EXCEPTION 'Table % must have an id column of type uuid', _relname;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = _relname
      AND column_name = 'deleted_at'
      AND data_type IN ('timestamp with time zone','timestamp without time zone')
  ) INTO has_deleted_at;

  IF NOT has_deleted_at THEN
    RAISE EXCEPTION 'Table % must have a deleted_at timestamp column', _relname;
  END IF;

  sql := format(
    'UPDATE public.%I
     SET deleted_at = now()
     WHERE id = $1 AND deleted_at IS NULL',
    _relname
  );

  EXECUTE sql USING _id;
  GET DIAGNOSTICS affected = ROW_COUNT;

  IF affected = 0 THEN
    RAISE EXCEPTION 'No row archived (not found or already archived)';
  END IF;
END $$;

-- Restore: sets deleted_at = NULL
CREATE OR REPLACE FUNCTION public.restore_row(_table regclass, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE
  allowed_tables text[] := ARRAY[
    'jobs','projects','floor_components','floor_plans','queued_uploads',
    'rams_docs','snags','component_completions','job_pins','organizations',
    'labour_time_tracking','labour_availability','labour_budget_tracking',
    'project_labour_allocation','product_labour_rates','job_floorplans',
    'daily_progress_log','construction_milestones','product_catalogue',
    'daily_progress_reports','quote_shares','progress_photos','weather_impact_log',
    'invoice_schedule_items','job_invoice_history'
  ];
  _schema text;
  _relname text;
  _relkind "char";
  has_id_uuid boolean;
  has_deleted_at boolean;
  sql text;
  affected int;
BEGIN
  IF _table IS NULL OR _id IS NULL THEN
    RAISE EXCEPTION 'Invalid input (table and id are required)';
  END IF;

  IF NOT public.is_soft_delete_role() AND NOT public.is_hard_delete_role() THEN
    RAISE EXCEPTION 'Not allowed: Insufficient permissions to restore.';
  END IF;

  SELECT n.nspname, c.relname, c.relkind
    INTO _schema, _relname, _relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.oid = _table;

  IF _schema IS NULL THEN
    RAISE EXCEPTION 'Table not found';
  END IF;

  IF _schema <> 'public' THEN
    RAISE EXCEPTION 'Only public tables are supported';
  END IF;

  IF _relkind NOT IN ('r','p') THEN
    RAISE EXCEPTION 'Only tables are supported';
  END IF;

  IF NOT (_relname = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'Table % is not allowed for restore_row', _relname;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = _relname
      AND column_name = 'id'
      AND udt_name = 'uuid'
  ) INTO has_id_uuid;

  IF NOT has_id_uuid THEN
    RAISE EXCEPTION 'Table % must have an id column of type uuid', _relname;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = _relname
      AND column_name = 'deleted_at'
      AND data_type IN ('timestamp with time zone','timestamp without time zone')
  ) INTO has_deleted_at;

  IF NOT has_deleted_at THEN
    RAISE EXCEPTION 'Table % must have a deleted_at timestamp column', _relname;
  END IF;

  sql := format(
    'UPDATE public.%I
     SET deleted_at = NULL
     WHERE id = $1 AND deleted_at IS NOT NULL',
    _relname
  );

  EXECUTE sql USING _id;
  GET DIAGNOSTICS affected = ROW_COUNT;

  IF affected = 0 THEN
    RAISE EXCEPTION 'No row restored (not found or not archived)';
  END IF;
END $$;

-- Hard delete: permanently deletes row (director/gm only)
CREATE OR REPLACE FUNCTION public.hard_delete_row(_table regclass, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
DECLARE
  allowed_tables text[] := ARRAY[
    'jobs','projects','floor_components','floor_plans','queued_uploads',
    'rams_docs','snags','component_completions','job_pins','organizations',
    'labour_time_tracking','labour_availability','labour_budget_tracking',
    'project_labour_allocation','product_labour_rates','job_floorplans',
    'daily_progress_log','construction_milestones','product_catalogue',
    'daily_progress_reports','quote_shares','progress_photos','weather_impact_log',
    'invoice_schedule_items','job_invoice_history'
  ];
  _schema text;
  _relname text;
  _relkind "char";
  has_id_uuid boolean;
  sql text;
  affected int;
BEGIN
  IF _table IS NULL OR _id IS NULL THEN
    RAISE EXCEPTION 'Invalid input (table and id are required)';
  END IF;

  IF NOT public.is_hard_delete_role() THEN
    RAISE EXCEPTION 'Not allowed: Only Directors/GMs can permanently delete.';
  END IF;

  SELECT n.nspname, c.relname, c.relkind
    INTO _schema, _relname, _relkind
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.oid = _table;

  IF _schema IS NULL THEN
    RAISE EXCEPTION 'Table not found';
  END IF;

  IF _schema <> 'public' THEN
    RAISE EXCEPTION 'Only public tables are supported';
  END IF;

  IF _relkind NOT IN ('r','p') THEN
    RAISE EXCEPTION 'Only tables are supported';
  END IF;

  IF NOT (_relname = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'Table % is not allowed for hard_delete_row', _relname;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = _relname
      AND column_name = 'id'
      AND udt_name = 'uuid'
  ) INTO has_id_uuid;

  IF NOT has_id_uuid THEN
    RAISE EXCEPTION 'Table % must have an id column of type uuid', _relname;
  END IF;

  sql := format('DELETE FROM public.%I WHERE id = $1', _relname);

  EXECUTE sql USING _id;
  GET DIAGNOSTICS affected = ROW_COUNT;

  IF affected = 0 THEN
    RAISE EXCEPTION 'No row deleted (not found)';
  END IF;
END $$;

-- Lock down EXECUTE (do NOT rely on defaults)
REVOKE EXECUTE ON FUNCTION public.archive_row(regclass, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restore_row(regclass, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.hard_delete_row(regclass, uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.archive_row(regclass, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_row(regclass, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.hard_delete_row(regclass, uuid) TO authenticated;

COMMIT;
