# Task Banner System - Setup Guide

I've created the foundation for the Task Banner system. Here's what's been built and what you need to do next.

## ✅ Files Created

### Database
- `database/task-banner-schema.sql` - Complete schema with 3 tables + RLS policies

### Types & Utilities
- `lib/taskBanner/types.ts` - TypeScript definitions
- `lib/taskBanner/brightness.ts` - Brightness calculation utilities

### API Routes
- `pages/api/task-banner/tasks.ts` - CRUD operations for tasks
- `pages/api/task-banner/settings.ts` - GET/PUT for settings
- `pages/api/task-banner/user-permissions.ts` - User permission management

## 🚀 Quick Start

### Step 1: Apply Database Schema

Run the SQL migration in your Supabase dashboard:

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `database/task-banner-schema.sql`
3. Paste and execute
4. Verify no errors

This creates:
- `task_banner_items` table
- `task_banner_settings` table (singleton with default values)
- `user_banner_permissions` table
- RLS policies for all tables
- Indexes for performance
- Triggers for `updated_at` columns

### Step 2: Enable Banner for Your User

In Supabase SQL Editor, run:

```sql
-- Replace 'your-user-id-here' with your actual user ID from auth.users
INSERT INTO user_banner_permissions (user_id, banner_enabled)
VALUES ('your-user-id-here', true);
```

To find your user ID:
```sql
SELECT id, email FROM auth.users WHERE email = 'your@email.com';
```

### Step 3: Create a Test Task

```sql
-- Replace 'your-user-id-here' with your user ID
INSERT INTO task_banner_items (
  title,
  type,
  frequency,
  due_date,
  navigation_route,
  assigned_to,
  created_by
) VALUES (
  'REVIEW PENDING INVOICES',
  'invoicing',
  'daily',
  NOW() + INTERVAL '30 minutes',  -- Due in 30 mins (brightness 5)
  '/invoicing/schedule',
  'all',
  'your-user-id-here'
);
```

### Step 4: Test API Routes

The API routes are ready to use. Test them with your auth token:

```bash
# Get your tasks
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/task-banner/tasks

# Get settings
curl http://localhost:3000/api/task-banner/settings

# Get your permission
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/task-banner/user-permissions
```

## 📋 What's Left to Build

### HIGH PRIORITY

#### 1. TaskBanner Component
**Location**: `components/TaskBanner.tsx`

You have the demo component provided. It needs to be adapted to:
- Remove demo state
- Fetch data from API routes
- Add Supabase realtime subscriptions
- Implement navigation with Next.js router
- Handle loading and error states

**Key changes needed**:
```typescript
// Replace demo data with API calls
useEffect(() => {
  fetchTasks();
  fetchSettings();
  setupRealtimeSubscriptions();
}, []);

async function fetchTasks() {
  const res = await fetch('/api/task-banner/tasks', {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  });
  const data = await res.json();
  setTasks(data.tasks);
}
```

#### 2. Layout Integration
**Location**: `components/Layout.tsx` or your main layout

**IMPORTANT**: TaskBanner must be positioned ABOVE the navbar at the very top of the viewport.

Add TaskBanner component:
```typescript
import TaskBanner from '@/components/TaskBanner';

export default function Layout({ children }) {
  return (
    <>
      <TaskBanner /> {/* ABOVE navbar - fixed to top */}
      <AppNav />     {/* Navbar below banner */}
      <main>{children}</main>
    </>
  );
}
```

**Positioning Requirements**:
- TaskBanner: `position: fixed; top: 0; left: 0; right: 0; z-index: 9999;`
- Navbar should have `top: [banner-height]px` or add padding to account for banner
- Banner height is typically 60-80px depending on font size settings

#### 3. Admin Page - Task Management
**Location**: `pages/admin/task-banner.tsx`

Create admin interface with:
- Highway appearance settings (background, colors, text style, font size)
- Create new task form
- Active tasks list with edit/delete
- Save settings to database

Use the provided demo component's AdminPanel as a starting point.

#### 4. User Management Integration
**Location**: `pages/admin/user-management.tsx` or existing users page

Add a toggle column for "Task Banner Access" that calls:
```typescript
await fetch('/api/task-banner/user-permissions', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_id: userId,
    banner_enabled: true/false
  })
});
```

### MEDIUM PRIORITY

#### 5. Realtime Subscriptions
Add to TaskBanner component:
```typescript
const tasksChannel = supabase
  .channel('task_banner_items_changes')
  .on('postgres_changes',
    { event: '*', schema: 'public', table: 'task_banner_items' },
    () => fetchTasks()
  )
  .subscribe();
```

#### 6. Task Navigation Handling
When task is clicked:
```typescript
async function handleTaskClick(task) {
  // Mark as in-progress if pending
  if (task.status === 'pending') {
    await fetch('/api/task-banner/tasks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: task.id,
        status: 'in_progress'
      })
    });
  }

  // Navigate
  router.push(task.navigation_route);
}
```

### LOW PRIORITY (Nice to Have)

#### 7. Recurring Task Generation
Create a cron job or scheduled function to auto-generate recurring tasks:
- Daily tasks: Create every day at midnight
- Weekly: Every Monday
- Monthly: 1st of each month

#### 8. Mobile Responsiveness
The banner is primarily designed for desktop. Add mobile breakpoints to hide or simplify on small screens.

#### 9. Task Snooze Feature
Allow users to temporarily hide tasks for X hours.

## 🎨 Customization

### Fonts
The component uses two fonts:
- **Inter** (Clean Neon style) - Likely already in your app
- **Rubik Pixels** (Dot Matrix style) - Add via Google Fonts

Add to your main layout or component:
```typescript
import { Inter } from 'next/font/google';
// For Rubik Pixels, use CDN link in <head>
```

### Colors
Edit the `highwayColors` object in TaskBanner component to add more background colors.

### Default Settings
Already configured in the SQL migration:
- Background: Black
- Text Style: Clean Neon
- Font Size: 24px
- Scroll Speed: 30s

## 🔐 Security Notes

The RLS policies ensure:
- Users only see tasks assigned to them based on role
- Only directors/admins can create/edit/delete tasks
- Only directors/admins can modify settings
- Only directors/admins can grant/revoke user permissions

## 🐛 Troubleshooting

### "relation task_banner_items does not exist"
Run the database migration SQL file.

### "Unauthorized" when calling API
Make sure you're passing the auth token in the Authorization header.

### Tasks not showing
1. Check `user_banner_permissions` - is banner_enabled = true for your user?
2. Check `task_banner_items` - do you have any tasks with status != 'completed'?
3. Check RLS policies are enabled

### Settings not updating
Ensure user role is 'director' or 'admin' in profiles table.

## 📊 Database Verification

After applying the schema, verify:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name LIKE '%task_banner%';

-- Should return:
-- task_banner_items
-- task_banner_settings
-- user_banner_permissions

-- Check default settings inserted
SELECT * FROM task_banner_settings;

-- Check RLS enabled
SELECT tablename, rowsecurity FROM pg_tables
WHERE tablename LIKE '%task_banner%';
-- All should have rowsecurity = true
```

## 🎯 Next Steps

1. ✅ Apply database schema (Step 1)
2. ✅ Enable banner for your user (Step 2)
3. ✅ Create test task (Step 3)
4. ✅ Test API routes (Step 4)
5. ⏳ Adapt TaskBanner component for production
6. ⏳ Integrate into Layout
7. ⏳ Create admin page
8. ⏳ Add user management toggle
9. ⏳ Add realtime subscriptions
10. ⏳ Deploy and test!

## 💡 Tips

- Start with Clean Neon + Black background - professional look
- Keep active tasks under 20 for performance
- Use brightness levels wisely - reserve 5 for truly urgent tasks
- Test with different user roles to verify RLS policies work

---

**All API routes, database schema, types, and utilities are ready to use!**

The heavy lifting is done. You just need to:
1. Apply the SQL
2. Build the TaskBanner component (use demo as reference)
3. Create admin UI
4. Wire it all together!

Good luck! 🚀
