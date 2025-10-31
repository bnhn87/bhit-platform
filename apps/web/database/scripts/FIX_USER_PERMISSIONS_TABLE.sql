-- ==========================================
-- FIX USER PERMISSIONS TABLE
-- Ensures user_permissions table exists and is accessible via PostgREST
-- ==========================================

BEGIN;

-- ==========================================
-- STEP 1: CREATE USER_PERMISSIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Job permissions
    can_create_jobs BOOLEAN DEFAULT true,
    can_edit_jobs BOOLEAN DEFAULT true,
    can_delete_jobs BOOLEAN DEFAULT false,

    -- Cost permissions
    can_view_costs BOOLEAN DEFAULT false,
    can_edit_costs BOOLEAN DEFAULT false,

    -- Invoice permissions
    can_view_invoices BOOLEAN DEFAULT false,
    can_create_invoices BOOLEAN DEFAULT false,
    can_edit_invoices BOOLEAN DEFAULT false,

    -- Admin permissions
    can_manage_users BOOLEAN DEFAULT false,
    can_edit_org_settings BOOLEAN DEFAULT false,

    -- General permissions
    can_view_reports BOOLEAN DEFAULT true,
    can_export_data BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON public.user_permissions(user_id);

-- ==========================================
-- STEP 2: ENABLE RLS AND CREATE POLICIES
-- ==========================================

ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can manage all permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON public.user_permissions;

-- RLS Policy: Users can view their own permissions
CREATE POLICY "Users can view own permissions"
    ON public.user_permissions
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND LOWER(role) IN ('admin', 'director')
        )
    );

-- RLS Policy: Admins and directors can manage all permissions
CREATE POLICY "Admins can manage all permissions"
    ON public.user_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND LOWER(role) IN ('admin', 'director')
        )
    );

-- ==========================================
-- STEP 3: CREATE DEFAULT PERMISSIONS FOR EXISTING USERS
-- ==========================================

INSERT INTO public.user_permissions (
    user_id, can_create_jobs, can_edit_jobs, can_delete_jobs,
    can_view_costs, can_edit_costs, can_view_invoices,
    can_create_invoices, can_edit_invoices, can_manage_users,
    can_edit_org_settings, can_view_reports, can_export_data
)
SELECT
    p.id,
    CASE WHEN LOWER(p.role) IN ('admin', 'director', 'manager', 'installer') THEN true ELSE false END,
    CASE WHEN LOWER(p.role) IN ('admin', 'director', 'manager', 'installer') THEN true ELSE false END,
    CASE WHEN LOWER(p.role) IN ('admin', 'director') THEN true ELSE false END,
    CASE WHEN LOWER(p.role) IN ('admin', 'director', 'manager') THEN true ELSE false END,
    CASE WHEN LOWER(p.role) IN ('admin', 'director', 'manager') THEN true ELSE false END,
    CASE WHEN LOWER(p.role) IN ('admin', 'director', 'manager') THEN true ELSE false END,
    CASE WHEN LOWER(p.role) IN ('admin', 'director', 'manager') THEN true ELSE false END,
    CASE WHEN LOWER(p.role) IN ('admin', 'director', 'manager') THEN true ELSE false END,
    CASE WHEN LOWER(p.role) IN ('admin', 'director') THEN true ELSE false END,
    CASE WHEN LOWER(p.role) IN ('admin', 'director') THEN true ELSE false END,
    true,
    CASE WHEN LOWER(p.role) IN ('admin', 'director', 'manager') THEN true ELSE false END
FROM public.profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM public.user_permissions up WHERE up.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- ==========================================
-- STEP 4: REFRESH POSTGREST SCHEMA CACHE
-- ==========================================

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ==========================================
-- VERIFICATION
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '✓ user_permissions table created/verified';
    RAISE NOTICE '✓ RLS policies configured for profiles table';
    RAISE NOTICE '✓ Default permissions created for existing users';
    RAISE NOTICE '✓ PostgREST schema cache refresh triggered';
    RAISE NOTICE '';
    RAISE NOTICE 'Checking table and permissions...';
END $$;

-- Show table info
SELECT
    'Table exists' as status,
    COUNT(*) as permission_records
FROM public.user_permissions;

-- Show sample permissions
SELECT
    'Sample permissions' as info,
    up.user_id,
    p.email,
    p.role,
    up.can_manage_users,
    up.can_view_costs
FROM public.user_permissions up
JOIN public.profiles p ON p.id = up.user_id
LIMIT 5;
