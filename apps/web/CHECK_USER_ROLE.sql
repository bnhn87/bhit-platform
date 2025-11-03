-- Check your current user role in Supabase
-- Run this in Supabase SQL Editor to see your role

-- First, get your current user ID
SELECT auth.uid() as my_user_id;

-- Then check your role
SELECT
  id,
  email,
  role,
  organization_id
FROM users
WHERE id = auth.uid();

-- If role is NULL or not 'ops', 'director', or 'admin', update it:
-- UPDATE users
-- SET role = 'director'  -- Change to 'ops', 'director', or 'admin'
-- WHERE id = auth.uid();

-- After updating, the NavBar should show SmartInvoice for these roles:
-- - ops: Shows Smart Quote, SmartInvoice, Floor Planner, Settings
-- - director: Shows Smart Quote, SmartInvoice, Floor Planner, Admin Panel, Costing, Settings
-- - admin: Shows Smart Quote, SmartInvoice, Floor Planner, Admin Panel, Costing, Settings
