# Task Banner System - Complete Setup Guide

The Task Banner system is now **fully integrated** with admin controls, user management, and personal preferences. Follow these steps to set it up.

## 🎯 Quick Setup (3 Steps)

### Step 1: Apply Database Schema

Run these SQL files in order in your Supabase SQL Editor:

1. **Base schema**: `database/task-banner-schema.sql`
2. **User preferences**: `database/task-banner-user-preferences-schema.sql`

### Step 2: Enable for Your User

Run `database/task-banner-quick-setup.sql` - **IMPORTANT**: Edit line 10 first!

```sql
user_email TEXT := 'your@email.com'; -- CHANGE THIS!
```

Replace `'your@email.com'` with your actual email address.

### Step 3: Refresh Your Browser

Hard refresh (Cmd+Shift+R or Ctrl+Shift+R) to see the task banner!

---

## ✨ Features

### 1. **Admin Panel** (Directors/Admins Only)
Location: `/admin-panel`

**Global Settings:**
- Highway appearance (background, color, text style)
- Font size (12-48px)
- Scroll speed (10-60 seconds)
- **Message spacing** (48-400px) - NEW!

**Task Management:**
- Create new tasks with urgency levels
- Set due dates (automatically calculates brightness 1-5)
- Assign to: All Users, Directors, or Managers
- Delete tasks
- View active tasks with brightness indicators

### 2. **User Management** (Directors/Admins Only)
Location: `/admin/user-management`

**New "Banner" Column:**
- Toggle task banner ON/OFF for each user
- Green toggle = enabled
- Grey toggle = disabled

### 3. **User Settings** (All Users)
Location: `/settings`

**Personal Preferences:**
- Customize YOUR view of the banner
- All same settings as admin panel
- Changes only affect your account
- **Message spacing control** - NEW!

User preferences override global settings!

---

## 🎨 How It Works

### Hierarchy of Settings:
1. **User Preferences** (highest priority) - set in `/settings`
2. **Global Settings** (fallback) - set in `/admin-panel`
3. **Demo Mode** (fallback if no database)

### Task Brightness Levels:
Tasks automatically calculate brightness based on due date:

- **Level 5 (Blazing)**: Due in < 1 hour
- **Level 4 (Bright)**: Due in 1-3 hours
- **Level 3 (Medium)**: Due in 3-6 hours
- **Level 2 (Dim)**: Due in 6-24 hours
- **Level 1 (Very Dim)**: Due in 1+ days

### Message Spacing:
Controls the gap (in pixels) between scrolling messages. Adjust between 48px-400px.

---

## 📁 File Structure

### Database
- `database/task-banner-schema.sql` - Core schema
- `database/task-banner-user-preferences-schema.sql` - User customization
- `database/task-banner-quick-setup.sql` - Quick setup script

### Components
- `components/TaskBanner.tsx` - Main banner component (supports user preferences + spacing)
- `components/admin/TaskBannerSettings.tsx` - Admin panel UI
- `components/settings/BannerPreferences.tsx` - User settings UI

### API Routes
- `pages/api/task-banner/tasks.ts` - Task CRUD
- `pages/api/task-banner/settings.ts` - Global settings
- `pages/api/task-banner/user-permissions.ts` - Enable/disable per user
- `pages/api/task-banner/user-preferences.ts` - User customization

### Types
- `lib/taskBanner/types.ts` - TypeScript definitions
- `lib/taskBanner/brightness.ts` - Urgency calculation

---

## 🔧 Admin Workflow

### Creating a Task

1. Go to `/admin-panel`
2. Scroll to "Task Banner Settings"
3. Click "+ Create Task"
4. Fill in:
   - **Title**: All caps recommended (e.g., "REVIEW PENDING INVOICES")
   - **Type**: Invoicing, Costs, Calls, or Admin (determines color)
   - **Frequency**: Once, Daily, Weekly, Biweekly, Monthly
   - **Due Date**: When the task is due (brightness auto-calculated)
   - **Navigation Route**: Where to go when clicked (e.g., `/invoicing/schedule`)
   - **Assigned To**: All Users, Directors Only, or Managers Only
5. Click "Create Task"

The task will appear on the highway for all enabled users!

### Enabling Users

1. Go to `/admin/user-management`
2. Find the user
3. Click their "Banner" toggle (green = enabled)

### Customizing Global Appearance

1. Go to `/admin-panel`
2. Scroll to "Task Banner Settings"
3. Adjust:
   - Show Background (toggle)
   - Background Color (14 options)
   - Text Style (Clean Neon or Dot Matrix)
   - Font Size (slider: 12-48px)
   - Scroll Speed (slider: 10-60 seconds)
   - **Message Spacing** (slider: 48-400px) - NEW!
4. Click "💾 Save Appearance Settings"

---

## 👤 User Workflow

### Customizing Your Banner

1. Go to `/settings`
2. Scroll to "Task Banner Preferences"
3. Adjust same settings as admin panel
4. Click "Save Banner Preferences"
5. **Refresh the page** to see changes

Your preferences override the global defaults!

---

## 🐛 Troubleshooting

### "I don't see the banner"

**Check 1**: Is it enabled for your user?
```sql
SELECT u.email, p.banner_enabled
FROM user_banner_permissions p
JOIN auth.users u ON u.id = p.user_id
WHERE u.email = 'your@email.com';
```

**Check 2**: Are there active tasks?
```sql
SELECT * FROM task_banner_items WHERE status != 'completed';
```

**Check 3**: Database schema applied?
```sql
SELECT COUNT(*) FROM task_banner_items;
SELECT COUNT(*) FROM task_banner_settings;
SELECT COUNT(*) FROM user_banner_preferences;
```

### "Changes aren't showing"

- **Hard refresh**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)
- Check browser console for errors

### "Banner toggle not working"

Make sure you're logged in as Director or Admin:
```sql
SELECT email, role FROM users WHERE email = 'your@email.com';
```

---

## 🎯 Color Guide

Task types have specific colors:

- **Invoicing**: Purple (`rgb(168, 85, 247)`)
- **Costs**: Green (`rgb(34, 197, 94)`)
- **Calls**: Blue (`rgb(59, 130, 246)`)
- **Admin**: Pink (`rgb(236, 72, 153)`)

---

## 📊 Database Tables

### `task_banner_items`
Stores all tasks with due dates and assignments.

### `task_banner_settings`
Singleton table with global appearance defaults.

### `user_banner_permissions`
Controls which users can see the banner.

### `user_banner_preferences`
User-specific customizations (overrides global settings).

---

## 🚀 Next Steps

1. Apply database schemas
2. Run quick setup script (with your email!)
3. Refresh browser to see demo task
4. Go to `/admin-panel` to create real tasks
5. Go to `/admin/user-management` to enable for team
6. Let users customize in `/settings`

---

## 💡 Tips

- Create urgent tasks (due < 1 hour) to see the blazing bright effect
- Use message spacing to control highway density
- Users can personalize their view without affecting others
- Click tasks to navigate to their route
- Tasks auto-hide when completed
- The banner only shows if you have active tasks AND banner enabled

---

**That's it!** You now have a fully functional task banner system with admin controls, user management, and personal customization! 🎉
