-- ==========================================
-- Migration 035: Fix User Management for Director Role
-- Updates all admin functions to also accept 'director' role
-- ==========================================

-- Drop existing functions to replace them
DROP FUNCTION IF EXISTS admin_setup_user_profile(UUID, TEXT, TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS admin_update_user(UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS admin_deactivate_user(UUID);
DROP FUNCTION IF EXISTS admin_activate_user(UUID);

-- ==========================================
-- PART 1: UPDATE ADMIN_SETUP_USER_PROFILE
-- ==========================================

CREATE OR REPLACE FUNCTION admin_setup_user_profile(
    p_user_id UUID,
    p_full_name TEXT,
    p_role TEXT,
    p_account_id UUID,
    p_permissions JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    -- Check if caller is admin or director
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'director')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Permission denied: Admin or Director privileges required'
        );
    END IF;

    -- Create user profile
    INSERT INTO user_profiles (id, full_name, role, account_id, is_active)
    VALUES (p_user_id, p_full_name, p_role, p_account_id, true)
    ON CONFLICT (id) DO UPDATE
    SET full_name = p_full_name,
        role = p_role,
        account_id = p_account_id,
        is_active = true;

    -- Setup permissions based on role defaults or custom permissions
    INSERT INTO user_permissions (
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
        can_export_data
    )
    VALUES (
        p_user_id,
        COALESCE((p_permissions->>'can_create_jobs')::boolean, p_role IN ('admin', 'director', 'manager', 'installer')),
        COALESCE((p_permissions->>'can_edit_jobs')::boolean, p_role IN ('admin', 'director', 'manager', 'installer')),
        COALESCE((p_permissions->>'can_delete_jobs')::boolean, p_role IN ('admin', 'director')),
        COALESCE((p_permissions->>'can_view_costs')::boolean, p_role IN ('admin', 'director', 'manager')),
        COALESCE((p_permissions->>'can_edit_costs')::boolean, p_role IN ('admin', 'director', 'manager')),
        COALESCE((p_permissions->>'can_view_invoices')::boolean, p_role IN ('admin', 'director', 'manager')),
        COALESCE((p_permissions->>'can_create_invoices')::boolean, p_role IN ('admin', 'director', 'manager')),
        COALESCE((p_permissions->>'can_edit_invoices')::boolean, p_role IN ('admin', 'director', 'manager')),
        COALESCE((p_permissions->>'can_manage_users')::boolean, p_role IN ('admin', 'director')),
        COALESCE((p_permissions->>'can_edit_org_settings')::boolean, p_role IN ('admin', 'director')),
        COALESCE((p_permissions->>'can_view_reports')::boolean, true),
        COALESCE((p_permissions->>'can_export_data')::boolean, p_role IN ('admin', 'director', 'manager'))
    )
    ON CONFLICT (user_id) DO UPDATE
    SET can_create_jobs = EXCLUDED.can_create_jobs,
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
        can_export_data = EXCLUDED.can_export_data;

    -- Grant cost access if needed
    IF p_role IN ('admin', 'director', 'manager') OR (p_permissions->>'can_view_costs')::boolean THEN
        INSERT INTO cost_access (user_id, has_access, granted_by)
        VALUES (p_user_id, true, auth.uid())
        ON CONFLICT (user_id) DO UPDATE
        SET has_access = true;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'message', 'User profile and permissions created successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PART 2: UPDATE ADMIN_UPDATE_USER
-- ==========================================

CREATE OR REPLACE FUNCTION admin_update_user(
    p_user_id UUID,
    p_full_name TEXT DEFAULT NULL,
    p_role TEXT DEFAULT NULL,
    p_permissions JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    -- Check if caller is admin or director
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'director')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Permission denied: Admin or Director privileges required'
        );
    END IF;

    -- Update user profile
    UPDATE user_profiles
    SET
        full_name = COALESCE(p_full_name, full_name),
        role = COALESCE(p_role, role),
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Update permissions if provided
    IF p_permissions IS NOT NULL THEN
        UPDATE user_permissions
        SET
            can_create_jobs = COALESCE((p_permissions->>'can_create_jobs')::boolean, can_create_jobs),
            can_edit_jobs = COALESCE((p_permissions->>'can_edit_jobs')::boolean, can_edit_jobs),
            can_delete_jobs = COALESCE((p_permissions->>'can_delete_jobs')::boolean, can_delete_jobs),
            can_view_costs = COALESCE((p_permissions->>'can_view_costs')::boolean, can_view_costs),
            can_edit_costs = COALESCE((p_permissions->>'can_edit_costs')::boolean, can_edit_costs),
            can_view_invoices = COALESCE((p_permissions->>'can_view_invoices')::boolean, can_view_invoices),
            can_create_invoices = COALESCE((p_permissions->>'can_create_invoices')::boolean, can_create_invoices),
            can_edit_invoices = COALESCE((p_permissions->>'can_edit_invoices')::boolean, can_edit_invoices),
            can_manage_users = COALESCE((p_permissions->>'can_manage_users')::boolean, can_manage_users),
            can_edit_org_settings = COALESCE((p_permissions->>'can_edit_org_settings')::boolean, can_edit_org_settings),
            can_view_reports = COALESCE((p_permissions->>'can_view_reports')::boolean, can_view_reports),
            can_export_data = COALESCE((p_permissions->>'can_export_data')::boolean, can_export_data),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'message', 'User updated successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PART 3: UPDATE ADMIN_DEACTIVATE_USER
-- ==========================================

CREATE OR REPLACE FUNCTION admin_deactivate_user(
    p_user_id UUID
)
RETURNS JSONB AS $$
BEGIN
    -- Check if caller is admin or director
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'director')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Permission denied: Admin or Director privileges required'
        );
    END IF;

    -- Prevent self-deactivation
    IF p_user_id = auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot deactivate your own account'
        );
    END IF;

    -- Deactivate user
    UPDATE user_profiles
    SET
        is_active = false,
        deactivated_at = NOW(),
        deactivated_by = auth.uid(),
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'message', 'User deactivated successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PART 4: UPDATE ADMIN_ACTIVATE_USER
-- ==========================================

CREATE OR REPLACE FUNCTION admin_activate_user(
    p_user_id UUID
)
RETURNS JSONB AS $$
BEGIN
    -- Check if caller is admin or director
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'director')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Permission denied: Admin or Director privileges required'
        );
    END IF;

    -- Activate user
    UPDATE user_profiles
    SET
        is_active = true,
        deactivated_at = NULL,
        deactivated_by = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'message', 'User activated successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- COMPLETION MESSAGE
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '✓ User management functions updated for director role';
    RAISE NOTICE '✓ All admin functions now accept both admin and director roles';
    RAISE NOTICE '✓ Director role permissions updated';
END $$;
