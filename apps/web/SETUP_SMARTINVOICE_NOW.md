# SmartInvoice Quick Setup - DO THIS NOW!

## Current Status

Based on diagnostic check:
- ✅ Storage bucket `documents` - EXISTS
- ✅ GEMINI_API_KEY - Configured
- ❌ DATABASE_URL - **MISSING** (critical!)
- ❌ Invoice tables - Not visible to PostgREST (schema cache issue)

## The Problem

Post gREST (Supabase's REST API) has a stuck schema cache and cannot see the `invoices`, `suppliers`, and related tables, even if they exist in the database.

**Solution**: Bypass PostgREST entirely using direct PostgreSQL connection.

---

## IMMEDIATE STEPS (5 minutes)

### Step 1: Get Database Password

1. Go to: https://supabase.com/dashboard/project/wivpmbeuwxpwlptemjuf/settings/database
2. Find the **"Database password"** section at the top
3. Click **"Reset database password"** if you don't have it
4. **COPY THE PASSWORD** - you'll need it in Step 2

### Step 2: Get Connection String

Still on the same page:

1. Scroll to **"Connection pooling"** section
2. Select mode: **"Transaction"** (NOT Session mode)
3. You'll see a connection string like:
   ```
   postgresql://postgres.wivpmbeuwxpwlptemjuf:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```
4. **COPY THIS STRING**
5. Replace `[YOUR-PASSWORD]` with the actual password from Step 1

### Step 3: Update .env.local

Open `/apps/web/.env.local` and:

1. Find line 9 which currently has:
   ```
   postgres://postgres:[YOUR-PASSWORD]@db.yrdofgrxfvlifxeutlfj.supabase.co:6543/postgres
   ```

2. **REPLACE IT** with:
   ```
   DATABASE_URL="postgresql://postgres.wivpmbeuwxpwlptemjuf:[YOUR-ACTUAL-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
   ```

   **IMPORTANT**:
   - Add `DATABASE_URL=` before the connection string
   - Replace `[YOUR-ACTUAL-PASSWORD]` with your real password (no brackets!)
   - Use the **Transaction mode pooler** URL, not the direct database URL

### Step 4: Restart Dev Server

```bash
# Stop the server (Ctrl+C in terminal)
# Then restart:
npm run dev
```

### Step 5: Verify It Works

```bash
# Test the endpoint:
curl http://localhost:3000/api/invoices/list

# Should return: []
# Should NOT return: connection error or "failed to connect"
```

---

## Step 6: Run Database Migration (If Tables Don't Exist)

If you still get errors after Steps 1-5, the tables might not exist yet. Run this SQL in Supabase SQL Editor:

https://supabase.com/dashboard/project/wivpmbeuwxpwlptemjuf/sql/new

Copy and paste the contents of:
```
/Users/benjaminhone_1/Desktop/BHIT WORK OS/apps/web/migrations/041_invoice_system.sql
```

Click **RUN** in the SQL Editor.

---

## Step 7: Test SmartInvoice

1. Navigate to: http://localhost:3000/smart-invoice
2. You should see the SmartInvoice interface
3. Try uploading a test invoice (PDF or image)
4. AI should extract the data automatically

---

## Troubleshooting

### Error: "connection refused" or "failed to connect to database"

**Cause**: DATABASE_URL is incorrect or not set

**Fix**:
- Check .env.local has `DATABASE_URL="..."` with proper quotes
- Password has no brackets `[]` around it
- Using **Transaction mode** pooler URL (port 6543)
- Restart dev server after changing .env.local

### Error: "relation 'invoices' does not exist"

**Cause**: Tables haven't been created

**Fix**: Run migration in Step 6 above

### Error: "Could not find the table 'public.invoices' in the schema cache" (PGRST205)

**Cause**: Using old Supabase client instead of direct connection

**Fix**:
- Ensure DATABASE_URL is set correctly
- Check `/pages/api/invoices/list.ts` uses `pg` library, not Supabase client
- Restart server

### Still having issues?

Run diagnostic:
```bash
curl http://localhost:3000/api/debug/smartinvoice-status | python3 -m json.tool
```

This will show exactly what's configured and what's missing.

---

## What Happens After Setup?

✅ SmartInvoice page loads
✅ Can upload invoices (PDF/images)
✅ AI extracts invoice data automatically
✅ Can edit invoices inline
✅ Can search, filter, sort invoices
✅ Can export to Excel
✅ Files stored in Supabase Storage
✅ Real-time database sync

---

## Example .env.local After Setup

```bash
NEXT_PUBLIC_SUPABASE_URL="https://wivpmbeuwxpwlptemjuf.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

GEMINI_API_KEY=AIzaSyB5OFgAr39RYwoJZu7OsQ4MFpiU4avpvdw
NEXT_PUBLIC_GEMINI_API_KEY=AIzaSyB5OFgAr39RYwoJZu7OsQ4MFpiU4avpvdw

# SmartInvoice Direct PostgreSQL Connection (CRITICAL!)
DATABASE_URL="postgresql://postgres.wivpmbeuwxpwlptemjuf:your_actual_password_here@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
```

**Note**: Replace `your_actual_password_here` with your real password!

---

## Quick Reference

- **Supabase Dashboard**: https://supabase.com/dashboard/project/wivpmbeuwxpwlptemjuf
- **Database Settings**: https://supabase.com/dashboard/project/wivpmbeuwxpwlptemjuf/settings/database
- **SQL Editor**: https://supabase.com/dashboard/project/wivpmbeuwxpwlptemjuf/sql/new
- **Storage**: https://supabase.com/dashboard/project/wivpmbeuwxpwlptemjuf/storage/buckets

---

**Created**: 2025-11-04
**Purpose**: Get SmartInvoice working NOW
**Time Required**: 5 minutes
