# Task Banner - Quick Start (3 Steps!)

The Task Banner component is **already integrated** and ready to go. You just need to set up the database.

## ✅ What's Already Done

- ✅ TaskBanner component created and integrated
- ✅ Positioned ABOVE navbar at top of screen
- ✅ API routes ready
- ✅ TypeScript types defined
- ✅ Realtime subscriptions configured

## 🚀 3 Steps to See It

### Step 1: Apply Database Schema

1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `database/task-banner-schema.sql`
3. Paste and execute
4. Verify no errors in output

### Step 2: Quick Setup (Enable + Create Demo Tasks)

1. Open `database/task-banner-quick-setup.sql`
2. **CHANGE LINE 9**: Replace `'your@email.com'` with your actual email
3. Copy the entire file contents
4. Paste into Supabase SQL Editor and execute

This will:
- Enable the banner for your user
- Create 5 demo tasks with different urgency levels
- Show you a verification summary

### Step 3: Refresh Your Browser

Hard refresh (Cmd+Shift+R or Ctrl+Shift+R) and you should see:

🎆 **Scrolling LED banner at the top** with your tasks!

Tasks will be colored and glowing based on urgency:
- **Blazing bright** = due in < 1 hour
- **Bright** = due in 1-3 hours
- **Medium** = due in 3-6 hours
- **Dim** = due in 6-24 hours
- **Very dim** = due in 1+ days

## 🎨 How It Works

- **Positioning**: Fixed to top, z-index 9999, above navbar
- **Visibility**: Only shows if you have active tasks AND banner enabled
- **Scrolling**: Tasks scroll continuously across the screen
- **Click**: Click any task to navigate to its route
- **Status**: Clicking a pending task marks it as "in progress" (half-faded)

## 🔧 Customization

Default settings (can be changed via admin panel later):
- Background: Black with LED grid effect
- Text Style: Clean Neon
- Font Size: 24px
- Scroll Speed: 30 seconds

## 🐛 Troubleshooting

### "I don't see the banner!"

**Check 1**: Did you apply both SQL files?
```sql
-- In Supabase SQL Editor, run:
SELECT COUNT(*) FROM task_banner_items; -- Should have tasks
SELECT COUNT(*) FROM user_banner_permissions WHERE banner_enabled = true; -- Should be 1+
```

**Check 2**: Do you have active tasks?
```sql
SELECT * FROM task_banner_items WHERE status != 'completed';
```

**Check 3**: Is banner enabled for your user?
```sql
SELECT u.email, p.banner_enabled
FROM user_banner_permissions p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'your@email.com';
```

**Check 4**: Browser console errors?
- Open DevTools → Console
- Look for any errors related to task-banner

### "Table doesn't exist"

You haven't applied `task-banner-schema.sql` yet. Do Step 1 first!

### "No user found with email"

The quick-setup script couldn't find your user. Check your email in the script matches exactly:

```sql
SELECT id, email FROM auth.users;
```

## 🎯 Next Steps

Once you see the banner working:

1. **Create real tasks** via API or admin panel
2. **Customize appearance** in settings (when you build admin UI)
3. **Enable for other users** via user management page

## 📝 Manual Task Creation

If you want to create tasks manually:

```sql
INSERT INTO task_banner_items (
  title,
  type,
  frequency,
  due_date,
  navigation_route,
  assigned_to,
  created_by
) VALUES (
  'YOUR TASK TITLE',
  'invoicing', -- or 'costs', 'calls', 'admin'
  'daily', -- or 'weekly', 'biweekly', 'monthly', 'once'
  NOW() + INTERVAL '1 hour', -- When it's due
  '/your/route', -- Where to navigate when clicked
  'all', -- or 'directors', 'managers'
  'your-user-id-here'
);
```

## 💡 Tips

- Create urgent tasks (due < 1 hour) to see the blazing bright effect
- Click tasks to see navigation working
- Check browser console for any errors
- The banner auto-hides if no tasks are active

---

**That's it!** Follow the 3 steps above and you'll see your task banner scrolling across the top of your dashboard! 🎉
