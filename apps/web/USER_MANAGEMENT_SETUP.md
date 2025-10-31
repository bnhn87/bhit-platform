# User Management Setup Guide

Complete admin dashboard for creating, managing, and resetting user passwords.

---

## 🎯 Features

✅ **Create New Users** - Email + password + role + auto-setup
✅ **Reset Password** - Admin can reset any user's password
✅ **Activate/Deactivate** - Soft disable users without deletion
✅ **Role Management** - Admin, Manager, Installer, User
✅ **Granular Permissions** - 12 permission flags per user
✅ **View User List** - See all users with last login

---

## 📋 Setup Instructions

### Step 1: Apply Database Migration

Run this in Supabase SQL Editor:

```sql
-- Run the migration file
\i migrations/034_add_user_management_functions.sql
```

**What it creates:**
- `user_permissions` table - Granular permission control
- `admin_setup_user_profile()` function
- `admin_update_user()` function
- `admin_deactivate_user()` function
- `admin_activate_user()` function
- `v_user_management` view - Complete user list with permissions

---

### Step 2: Add Service Role Key to `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key  # ⚠️ REQUIRED FOR USER CREATION
```

**Where to find the service role key:**
1. Go to Supabase Dashboard
2. Settings → API
3. Copy "service_role" key (secret)

⚠️ **IMPORTANT:** Never expose service_role key in client-side code!

---

### Step 3: Restart Development Server

```bash
npm run dev
```

---

## 🚀 Usage

### Access User Management Dashboard

Navigate to: **http://localhost:3000/admin/user-management**

**Requirements:**
- Must be logged in
- Must have `role = 'admin'` in `user_profiles` table

---

### Create New User

1. Click "Create New User" button
2. Fill in the form:
   - **Email** - User's email address
   - **Password** - Minimum 8 characters
   - **Full Name** - Display name
   - **Role** - Admin, Manager, Installer, or User

3. Click "Create User"

**What happens:**
- User is created in `auth.users` with email confirmed
- User profile created in `user_profiles`
- Permissions auto-assigned based on role
- Cost access granted for admin/manager
- User can log in immediately

---

### Reset User Password

1. Find user in the table
2. Click "Reset Password"
3. Enter new password (min 8 characters)
4. User can now log in with new password

**Use cases:**
- User forgot password
- User locked out
- Security requirement to change password

---

### Deactivate/Activate User

1. Find user in the table
2. Click "Deactivate" or "Activate"

**Deactivate:**
- Sets `is_active = false`
- Records who deactivated and when
- User cannot log in (blocked by RLS)

**Activate:**
- Sets `is_active = true`
- Clears deactivation info
- User can log in again

---

## 🔐 Role & Permission Defaults

### Admin Role
✅ All permissions enabled
- Can create/edit/delete jobs
- Can view/edit costs
- Can view/create/edit invoices
- Can manage users
- Can edit org settings
- Can view reports and export data

### Manager Role
✅ Most permissions enabled
- Can create/edit jobs (no delete)
- Can view/edit costs
- Can view/create/edit invoices
- Can view reports and export data

### Installer Role
✅ Job-focused permissions
- Can create/edit jobs (no delete)
- Can view reports
- No cost/invoice access by default

### User Role
✅ Basic permissions
- Can create/edit jobs (no delete)
- Can view reports

---

## 📊 Granular Permissions

Each user has 12 permission flags (independent of role):

| Permission | Description |
|------------|-------------|
| `can_create_jobs` | Create new jobs |
| `can_edit_jobs` | Edit existing jobs |
| `can_delete_jobs` | Delete jobs |
| `can_view_costs` | View cost data |
| `can_edit_costs` | Edit cost calculations |
| `can_view_invoices` | View invoice schedules |
| `can_create_invoices` | Create new invoices |
| `can_edit_invoices` | Edit invoices |
| `can_manage_users` | Manage users (admin only) |
| `can_edit_org_settings` | Edit org settings (admin only) |
| `can_view_reports` | View reports and analytics |
| `can_export_data` | Export data to CSV/PDF |

**Override defaults** by passing `permissions` JSON when creating user.

---

## 🔍 API Endpoints

### Create User
```bash
POST /api/admin/users/create
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123",
  "full_name": "John Doe",
  "role": "manager",
  "account_id": "<uuid>",
  "permissions": {  // Optional - overrides role defaults
    "can_view_costs": true,
    "can_edit_costs": false
  }
}
```

### Reset Password
```bash
POST /api/admin/users/reset-password
Content-Type: application/json

{
  "user_id": "<uuid>",
  "new_password": "newsecurepassword123"
}
```

### List Users
```bash
GET /api/admin/users/list
```

### Update User
```bash
PATCH /api/admin/users/update
Content-Type: application/json

{
  "user_id": "<uuid>",
  "full_name": "Updated Name",  // Optional
  "role": "manager",             // Optional
  "permissions": {               // Optional
    "can_view_costs": true
  }
}
```

---

## 🛡️ Security Features

### Multi-Tenant Isolation
- Users only see others in their `account_id`
- Cannot create users in different accounts
- RLS policies enforce isolation

### Role-Based Access
- Only admins can access user management
- API endpoints check role before execution
- Database functions verify admin role

### Audit Trail
- Records who deactivated users
- Tracks when users were deactivated
- Last login timestamp visible

### Password Security
- Minimum 8 characters enforced
- Passwords hashed by Supabase Auth
- No password storage in application

---

## 📁 Files Created

### Database
- `migrations/034_add_user_management_functions.sql` - Migration script

### API Routes
- `pages/api/admin/users/create.ts` - Create user endpoint
- `pages/api/admin/users/reset-password.ts` - Reset password endpoint
- `pages/api/admin/users/list.ts` - List users endpoint
- `pages/api/admin/users/update.ts` - Update user endpoint

### UI Components
- `pages/admin/user-management.tsx` - Admin dashboard page

---

## 🧪 Testing

### Test User Creation

1. Go to `/admin/user-management`
2. Click "Create New User"
3. Fill in test user:
   - Email: test@example.com
   - Password: testpass123
   - Name: Test User
   - Role: User
4. Click "Create User"
5. Log out and try logging in as test user

### Test Password Reset

1. Create a test user
2. Click "Reset Password"
3. Enter new password
4. Log out
5. Try logging in with old password (should fail)
6. Log in with new password (should work)

### Test Deactivation

1. Deactivate a test user
2. Log out
3. Try logging in as deactivated user
4. Should see error: "User is inactive"

---

## 🐛 Troubleshooting

### Error: "SUPABASE_SERVICE_ROLE_KEY is not defined"

**Solution:** Add service role key to `.env.local`:
```env
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Error: "Permission denied: Only admins can create users"

**Solution:** Ensure your user has `role = 'admin'`:
```sql
UPDATE user_profiles SET role = 'admin' WHERE id = '<your-user-id>';
```

### Error: "User creation failed: User already registered"

**Solution:** Email already exists. Use a different email or delete the existing user.

### Users not appearing in list

**Solution:** Check that users have matching `account_id`:
```sql
SELECT id, full_name, account_id FROM user_profiles;
```

---

## 🎊 Success!

You now have a complete user management system:
- ✅ Create users with email/password
- ✅ Reset passwords from admin dashboard
- ✅ Activate/deactivate users
- ✅ Role-based permissions
- ✅ Granular permission control
- ✅ Multi-tenant security

**Access at:** `/admin/user-management`

---

**Setup Date:** 2025-10-16
**Version:** 1.0.0
