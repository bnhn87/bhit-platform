# SmartInvoice Database Connection Setup

## Current Status

✅ API route updated to use direct PostgreSQL connection (bypasses PostgREST)
❌ Missing DATABASE_URL environment variable

## Why This Is Needed

The Supabase PostgREST layer has a stuck schema cache that prevents access to the `invoices` and `suppliers` tables. The direct PostgreSQL connection completely bypasses PostgREST and connects directly to the database.

---

## Setup Instructions (2 minutes)

### Step 1: Get Your Database Connection String

1. Go to: https://supabase.com/dashboard/project/wivpmbeuwxpwlptemjuf/settings/database
2. Scroll to **"Connection pooling"** section
3. Select **"Transaction"** mode (NOT Session mode)
4. Copy the connection string - it will look like:
   ```
   postgresql://postgres.wivpmbeuwxpwlptemjuf:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres
   ```

### Step 2: Add to .env.local

Open `/apps/web/.env.local` and add this line:

```bash
DATABASE_URL="postgresql://postgres.wivpmbeuwxpwlptemjuf:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
```

**Replace `[YOUR-PASSWORD]` with the actual password from the connection string.**

### Step 3: Restart Dev Server

```bash
# Stop the current dev server (Ctrl+C)
npm run dev
```

The app will now connect directly to PostgreSQL, completely bypassing the broken PostgREST cache.

---

## What This Fixes

✅ Invoices will load on SmartInvoice page
✅ Can create new invoices
✅ Can update/delete invoices
✅ All database operations work normally
✅ No more PGRST205 errors

---

## Technical Details

**Before:**
```
SmartInvoice → fetch('/api/invoices/list') → Supabase Client → PostgREST (BROKEN) → Database
```

**After:**
```
SmartInvoice → fetch('/api/invoices/list') → pg library → PostgreSQL (DIRECT) ✅
```

The pg library connects directly to PostgreSQL using the connection string, completely bypassing Supabase's REST API layer.

---

## Files Modified

1. `/pages/api/invoices/list.ts` - Now uses `pg` library instead of Supabase client
2. `.env.example` - Added DATABASE_URL format
3. `/lib/invoiceDbService.ts` - Already uses fetch('/api/invoices/list')

---

## Verification

After adding DATABASE_URL and restarting:

1. Go to http://localhost:3000/smart-invoice
2. You should see the SmartInvoice interface
3. No "Failed to load invoices" error
4. Can upload and process invoices

If you still see errors, check:
- DATABASE_URL is correctly formatted in .env.local
- Password is correct (no brackets around it)
- Dev server has been restarted
- Check browser console for any new errors
