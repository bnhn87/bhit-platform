# FIX: "relation 'invoices' does not exist" Error

## 🔴 Error Explanation

This error means the **database tables haven't been created yet**. SmartInvoice requires 11 tables to be created in your Supabase database.

**Current state:** ❌ No database tables
**Required state:** ✅ 11 tables created

---

## ✅ SOLUTION: Deploy Database Migration (5 minutes)

### Step 1: Open the Migration File

**File location:** `DEPLOY_SMARTINVOICE_MIGRATIONS.sql` (in your project root)

**OR download it from:**
```
https://github.com/bnhn87/bhit-platform/blob/claude/fix-smartinvoice-error-011CUn13FLPhduCk1XB83MH4/DEPLOY_SMARTINVOICE_MIGRATIONS.sql
```

### Step 2: Copy ALL Contents

Open the file and copy **everything** (all 375 lines).

**Quick way:**
```bash
# On Mac/Linux
cat DEPLOY_SMARTINVOICE_MIGRATIONS.sql | pbcopy

# Or just open in text editor and Ctrl+A, Ctrl+C
```

### Step 3: Open Supabase SQL Editor

1. Go to your Supabase project: https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar (database icon)
4. Click **"+ New query"**

### Step 4: Paste and Run

1. **Paste** the entire SQL file contents into the editor
2. Click **"Run"** (or press Cmd/Ctrl + Enter)
3. Wait 5-10 seconds for it to complete

### Step 5: Verify Success

You should see output like:
```
NOTICE: ============================================
NOTICE: SmartInvoice Migration Complete!
NOTICE: Tables created: 11 / 11
NOTICE: Status: SUCCESS ✓
NOTICE: All tables have been created successfully.
NOTICE: ============================================
```

---

## 🧪 Verify Tables Were Created

Run this query in Supabase SQL Editor:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'suppliers',
  'invoices',
  'invoice_line_items',
  'invoice_corrections',
  'document_templates',
  'template_fields',
  'active_learning_requests',
  'learning_patterns',
  'predicted_corrections',
  'anomaly_detections',
  'validation_results'
)
ORDER BY table_name;
```

**Expected result:** Should return 11 rows (all tables).

---

## 🔄 Test SmartInvoice Again

1. **Restart your dev server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

2. **Visit SmartInvoice page:**
   ```
   http://localhost:3000/smart-invoice
   ```

3. **Verify setup:**
   ```
   http://localhost:3000/api/test-smartinvoice-setup
   ```

**Expected result:** ✅ No more "relation does not exist" error!

---

## 📋 What Gets Created

The migration creates these 11 tables:

**Core Tables:**
1. `suppliers` - Vendor information
2. `invoices` - Main invoice records ⭐ (This fixes your error!)
3. `invoice_line_items` - Line-by-line breakdowns
4. `invoice_corrections` - For AI learning

**Document Templates:**
5. `document_templates` - Visual layouts
6. `template_fields` - Field coordinates

**AI Learning:**
7. `active_learning_requests` - AI asks for help
8. `learning_patterns` - Detected patterns
9. `predicted_corrections` - AI suggestions
10. `anomaly_detections` - Fraud detection
11. `validation_results` - Business logic checks

**Plus:** 20+ indexes, triggers, and RLS policies

---

## ⚠️ Common Issues

### Issue: "permission denied for schema public"

**Cause:** You're not using the right Supabase connection

**Solution:**
- Make sure you're logged into the correct Supabase project
- Use the SQL Editor in the Supabase dashboard (not a direct psql connection)

### Issue: "relation 'organizations' does not exist"

**Cause:** Your database is missing the base tables

**Solution:**
- You need to run the base setup migrations first
- Check if your Supabase project has the `organizations` and `users` tables
- You may need to run initial project setup

### Issue: Migration runs but error persists

**Solution:**
1. Clear browser cache and reload page
2. Restart dev server
3. Check environment variables are set correctly:
   ```bash
   # In .env.local
   NEXT_PUBLIC_SUPABASE_URL=your_url
   SUPABASE_SERVICE_ROLE_KEY=your_key
   ```

---

## 🎯 Quick Summary

**Problem:** `relation "invoices" does not exist`
**Cause:** Database tables not created
**Solution:** Run `DEPLOY_SMARTINVOICE_MIGRATIONS.sql` in Supabase
**Time:** 5 minutes
**Result:** All 11 tables created, SmartInvoice works! ✅

---

## 📞 Still Stuck?

If the error persists after running the migration:

1. **Check the SQL Editor output** - look for any error messages
2. **Verify environment variables:**
   ```bash
   cat apps/web/.env.local
   ```
3. **Test the setup endpoint:**
   ```bash
   curl http://localhost:3000/api/test-smartinvoice-setup
   ```

The migration file is **safe to run multiple times** (uses `IF NOT EXISTS`), so you can run it again if needed.
