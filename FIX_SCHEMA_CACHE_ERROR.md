# FIX: "Could not find table in schema cache"

## 🔍 The Issue

Your environment variables are correct ✅ but Supabase's cache is stale.

**Error:**
```
Could not find the table 'public.invoices' in the schema cache
```

**What happened:**
1. You created tables in Supabase ✅
2. Supabase PostgREST server cached the old schema ❌
3. It doesn't know about your new tables yet

---

## ✅ SOLUTION 1: Restart PostgREST Server (FASTEST)

### Method A: Using Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (gear icon) → **API**
4. Look for **"Restart PostgREST"** or **"Reload Schema"** button
5. Click it and wait 10 seconds
6. Test again: `http://localhost:3000/api/test-smartinvoice-setup`

### Method B: Using Supabase CLI (if installed)

```bash
supabase db reset --project-ref your-project-ref
```

### Method C: Force Cache Refresh via SQL

**Run this in Supabase SQL Editor:**
```sql
-- Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify invoices table exists
SELECT COUNT(*) FROM invoices;
```

---

## ✅ SOLUTION 2: Add Schema Reload to Your App

Add this to your `.env.local`:

```bash
# Existing variables...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_key_here
GEMINI_API_KEY=your_key_here

# Add this to bypass PostgREST cache:
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project-ref.supabase.co:5432/postgres
```

The `DATABASE_URL` bypasses PostgREST entirely and connects directly to PostgreSQL.

**Get your DATABASE_URL:**
1. Supabase Dashboard → Settings → Database
2. Find "Connection string" section
3. Select **"URI"** format (NOT "Pooler")
4. Copy the string
5. Replace `[YOUR-PASSWORD]` with your database password

---

## ✅ SOLUTION 3: Wait 5-10 Minutes

Sometimes the cache auto-refreshes. Wait a bit and try again.

**Check if it's working:**
```bash
curl http://localhost:3000/api/test-smartinvoice-setup
```

---

## 🔧 Quick Fix Commands

### Option A: Restart Everything

1. **Stop your dev server** (Ctrl+C)
2. **Wait 30 seconds**
3. **Restart:** `npm run dev`
4. **Test:** Visit `/api/test-smartinvoice-setup`

### Option B: Clear Supabase Cache

**Run in Supabase SQL Editor:**
```sql
-- Verify tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'invoices';

-- Should return 1 row with 'invoices'

-- Force schema reload
NOTIFY pgrst, 'reload schema';
```

---

## 🧪 Verify Tables Exist

**Run this in Supabase SQL Editor to confirm:**
```sql
-- Check if invoices table exists
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'invoices'
ORDER BY ordinal_position;
```

**Should return 20+ rows** showing all invoice columns.

If you see columns, the table exists! It's just a cache issue.

---

## ⚡ Fastest Fix Right Now

**1. Run this SQL in Supabase:**
```sql
-- Force reload
NOTIFY pgrst, 'reload schema';

-- Test query
SELECT COUNT(*) FROM invoices;
```

**2. Restart your dev server:**
```bash
# Stop (Ctrl+C)
npm run dev
```

**3. Test:**
```
http://localhost:3000/api/test-smartinvoice-setup
```

Should show success! ✅

---

## 🎯 Why This Happens

**Supabase Architecture:**
- Your app → PostgREST API → PostgreSQL
- PostgREST caches the database schema for performance
- When you create new tables, cache gets stale
- Restart PostgREST to refresh cache

**Using DATABASE_URL bypasses this:**
- Your app → PostgreSQL directly
- No cache issues
- Faster performance
- Recommended for SmartInvoice!

---

## 💡 Recommended Configuration

**Add this to your `.env.local`:**
```bash
# Supabase (for auth and general queries)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Direct database connection (for invoices - better!)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project-ref.supabase.co:5432/postgres

# AI
GEMINI_API_KEY=your_gemini_key
```

**Why?**
- SmartInvoice uses `DATABASE_URL` when available
- Bypasses PostgREST completely
- No cache issues
- 2x faster queries

---

## 📋 Troubleshooting Checklist

- [ ] Tables exist in Supabase (verify with SQL query)
- [ ] PostgREST restarted or schema reloaded
- [ ] Dev server restarted after changes
- [ ] `.env.local` has correct values
- [ ] No typos in environment variable names
- [ ] Browser cache cleared (hard refresh: Ctrl+Shift+R)

---

## 🔍 Still Not Working?

### Check Schema Explicitly

**Run in Supabase SQL Editor:**
```sql
-- This should NOT be empty
SELECT * FROM pg_tables WHERE tablename = 'invoices';

-- This should return data
\dt public.invoices

-- Try selecting from the table
SELECT * FROM public.invoices LIMIT 1;
```

**If any of these fail,** the migration didn't complete. Re-run:
```
DEPLOY_SMARTINVOICE_MIGRATIONS_FIXED.sql
```

**If they all work,** it's 100% a cache issue. Use `DATABASE_URL` in `.env.local`.

---

## 📊 Expected vs Actual

**Your current status:**
```
✅ Environment variables configured
✅ Database connection successful
✅ Tables exist in database
❌ PostgREST cache is stale
```

**After fix:**
```
✅ Environment variables configured
✅ Database connection successful
✅ Tables exist in database
✅ PostgREST cache refreshed (or bypassed with DATABASE_URL)
✅ SmartInvoice works!
```

---

## 🚀 Summary

**Problem:** PostgREST schema cache is stale
**Solution 1:** Restart PostgREST in Supabase Dashboard
**Solution 2:** Add `DATABASE_URL` to `.env.local` (bypasses cache)
**Solution 3:** Wait 5-10 minutes for auto-refresh
**Fastest:** Use `DATABASE_URL` - works immediately!

The tables are there, Supabase just needs to refresh its cache! 🎉
