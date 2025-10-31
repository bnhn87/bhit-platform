-- ==========================================
-- SET DIRECTOR PERMISSIONS IN USER_METADATA
-- This updates your auth.users metadata directly
-- ==========================================

-- Note: This needs to be done via Supabase Dashboard > Authentication > Users
-- Click on your user → User Metadata → Edit
-- Or use the Supabase client in your API

-- For now, you can test by creating a new user, or use the API endpoint
-- to update your own permissions.

-- To set via SQL (requires updating auth.users which has special handling):
-- We'll use the admin API endpoint instead.

SELECT 'Run this command via your browser console or create a test API call:' as instruction;
SELECT 'await supabase.auth.admin.updateUserById("0c198b18-6037-46f7-bfea-1a4946efe0ff", {
  user_metadata: {
    full_name: "Ben Hone",
    role: "director",
    permissions: {
      can_create_jobs: true,
      can_edit_jobs: true,
      can_delete_jobs: true,
      can_view_costs: true,
      can_edit_costs: true,
      can_view_invoices: true,
      can_create_invoices: true,
      can_edit_invoices: true,
      can_manage_users: true,
      can_edit_org_settings: true,
      can_view_reports: true,
      can_export_data: true
    }
  }
})' as example_code;
