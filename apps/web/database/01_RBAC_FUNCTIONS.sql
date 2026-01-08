-- =============================================================================
-- 01_RBAC_FUNCTIONS.sql (FIXED + HARDENED)
-- =============================================================================
BEGIN;

-- Role of the current authenticated user (bypasses RLS on profiles safely)
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_role(_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (
       SELECT 1
       FROM public.profiles p
       WHERE p.id = auth.uid()
         AND p.role = ANY(_roles)
     );
$$;

CREATE OR REPLACE FUNCTION public.is_soft_delete_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT public.is_role(ARRAY['admin','ops']);
$$;

CREATE OR REPLACE FUNCTION public.is_hard_delete_role()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT public.is_role(ARRAY['director','general_manager']);
$$;

CREATE OR REPLACE FUNCTION public.is_privileged_read()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
SET row_security = off
AS $$
  SELECT public.is_role(ARRAY['admin','ops','director','general_manager','manager']);
$$;

-- Lock down EXECUTE (do NOT rely on defaults)
REVOKE EXECUTE ON FUNCTION public.my_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_role(text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_soft_delete_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_hard_delete_role() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_privileged_read() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_role(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_soft_delete_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_hard_delete_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_privileged_read() TO authenticated;

COMMIT;
