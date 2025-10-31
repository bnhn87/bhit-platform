-- ==========================================
-- ADD PERMISSIONS COLUMN TO PROFILES TABLE
-- Store permissions as JSONB directly in profiles
-- ==========================================

BEGIN;

-- Add permissions column to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'profiles'
        AND column_name = 'permissions'
    ) THEN
        ALTER TABLE public.profiles ADD COLUMN permissions JSONB DEFAULT '{
            "can_create_jobs": true,
            "can_edit_jobs": true,
            "can_delete_jobs": false,
            "can_view_costs": false,
            "can_edit_costs": false,
            "can_view_invoices": false,
            "can_create_invoices": false,
            "can_edit_invoices": false,
            "can_manage_users": false,
            "can_edit_org_settings": false,
            "can_view_reports": true,
            "can_export_data": false
        }'::jsonb;
        RAISE NOTICE '✓ Added permissions column to profiles';
    ELSE
        RAISE NOTICE '- permissions column already exists';
    END IF;
END $$;

-- Set default permissions based on role for existing users
UPDATE public.profiles
SET permissions = jsonb_build_object(
    'can_create_jobs', LOWER(role) IN ('admin', 'director', 'manager', 'installer'),
    'can_edit_jobs', LOWER(role) IN ('admin', 'director', 'manager', 'installer'),
    'can_delete_jobs', LOWER(role) IN ('admin', 'director'),
    'can_view_costs', LOWER(role) IN ('admin', 'director', 'manager'),
    'can_edit_costs', LOWER(role) IN ('admin', 'director', 'manager'),
    'can_view_invoices', LOWER(role) IN ('admin', 'director', 'manager'),
    'can_create_invoices', LOWER(role) IN ('admin', 'director', 'manager'),
    'can_edit_invoices', LOWER(role) IN ('admin', 'director', 'manager'),
    'can_manage_users', LOWER(role) IN ('admin', 'director'),
    'can_edit_org_settings', LOWER(role) IN ('admin', 'director'),
    'can_view_reports', true,
    'can_export_data', LOWER(role) IN ('admin', 'director', 'manager')
)
WHERE permissions IS NULL OR permissions = '{}'::jsonb;

-- Create index for faster permission lookups
CREATE INDEX IF NOT EXISTS idx_profiles_permissions ON public.profiles USING gin(permissions);

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Verification
DO $$
BEGIN
    RAISE NOTICE '✓ Permissions column added to profiles table';
    RAISE NOTICE '✓ Default permissions set for existing users';
    RAISE NOTICE '✓ You can now update permissions directly in the profiles table';
END $$;

SELECT 'Profiles with permissions' as info, COUNT(*) as count
FROM public.profiles
WHERE permissions IS NOT NULL;
