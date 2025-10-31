-- Step 1: Check if user exists in public.users
SELECT * FROM users WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';

-- Step 2: Create the user in public.users
INSERT INTO users (id, account_id, role, full_name, lang, updated_at)
VALUES (
  '97ac31b9-4953-4bb0-be23-e8f204acc337',
  '0ebae71c-6c8d-45e1-9e18-9b83f3eba4b5',
  'director',
  'Ben Hone',  -- REPLACE WITH YOUR ACTUAL NAME
  'en',
  NOW()
);

-- Step 3: Create user_profiles record
INSERT INTO user_profiles (id, account_id, full_name, role, is_active, created_at, updated_at)
VALUES (
  '97ac31b9-4953-4bb0-be23-e8f204acc337',
  '0ebae71c-6c8d-45e1-9e18-9b83f3eba4b5',
  'Ben Hone',  -- MUST MATCH THE NAME YOU USED IN STEP 2
  'director',
  true,
  NOW(),
  NOW()
);

-- Step 4: Create user_permissions record
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
  can_export_data,
  created_at,
  updated_at
) VALUES (
  '97ac31b9-4953-4bb0-be23-e8f204acc337',
  true,  -- can_create_jobs
  true,  -- can_edit_jobs
  true,  -- can_delete_jobs
  true,  -- can_view_costs
  true,  -- can_edit_costs
  true,  -- can_view_invoices
  true,  -- can_create_invoices
  true,  -- can_edit_invoices
  true,  -- can_manage_users
  true,  -- can_edit_org_settings
  true,  -- can_view_reports
  true,  -- can_export_data
  NOW(),
  NOW()
);

-- Step 5: Verify everything was created (run each separately)
SELECT * FROM users WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';
SELECT * FROM user_profiles WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';
SELECT * FROM user_permissions WHERE user_id = '97ac31b9-4953-4bb0-be23-e8f204acc337';
