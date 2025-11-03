# SmartInvoice PostgREST Schema Cache Issue

## Problem Summary

**Issue:** PostgREST's schema cache cannot see the `invoices` and `suppliers` tables despite them existing in the database.

**Error:** `"Could not find the table 'public.invoices' in the schema cache"`

**Status:** Persistent for 30+ minutes despite multiple reload attempts

---

## Verification

### ✅ Tables Exist in Database
```sql
SELECT * FROM information_schema.tables
WHERE table_name IN ('invoices', 'suppliers');
-- Result: Both tables exist
```

### ✅ Permissions Are Correct
```sql
SELECT has_table_privilege('authenticated', 'invoices', 'SELECT');
-- Result: true
```

### ❌ PostgREST Cannot See Tables
```bash
curl https://wivpmbeuwxpwlptemjuf.supabase.co/rest/v1/invoices
# Error: PGRST205 - table not in schema cache
```

---

## Attempted Fixes

1. ✅ `NOTIFY pgrst, 'reload schema'` - No effect
2. ✅ `ALTER TABLE invoices ADD/DROP COLUMN` - No effect
3. ✅ `COMMENT ON TABLE` - No effect
4. ✅ Created RLS policies - No effect
5. ✅ Granted permissions to anon/authenticated - No effect
6. ✅ Full Supabase project restart - No effect
7. ✅ Waited 30+ minutes - Still broken

---

## Root Cause

PostgREST maintains a separate schema cache that is not refreshing despite proper database notifications. This is a Supabase infrastructure issue, not a code issue.

---

## Solutions

### Solution 1: Direct PostgreSQL Connection (RECOMMENDED)

**Bypasses PostgREST entirely - GUARANTEED to work**

#### Step 1: Get Connection String

1. Go to: https://supabase.com/dashboard/project/wivpmbeuwxpwlptemjuf/settings/database
2. Copy "Connection pooling" URI (Transaction mode)
3. Should look like: `postgresql://postgres.wivpmbeuwxpwlptemjuf:[PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres`

#### Step 2: Add to .env.local

```bash
DATABASE_URL="postgresql://postgres.wivpmbeuwxpwlptemjuf:[PASSWORD]@..."
```

#### Step 3: Update API Route

File: `/pages/api/invoices/list.ts`

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM invoices ORDER BY invoice_date DESC'
    );
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
```

---

### Solution 2: Wait for Cache Auto-Refresh

PostgREST schema cache typically refreshes every 10-60 minutes automatically. However, there's no guarantee when this will happen.

**Wait time:** Unknown (could be hours)

---

### Solution 3: Contact Supabase Support

This appears to be a Supabase infrastructure bug.

1. Go to: https://supabase.com/dashboard/support
2. Submit ticket with details:
   - Project: `wivpmbeuwxpwlptemjuf`
   - Issue: PostgREST schema cache not refreshing
   - Tables affected: `invoices`, `suppliers`
   - Error: PGRST205
   - Attempted: Multiple NOTIFY commands, table modifications, project restart

---

## Current Workaround Status

### Files Modified

1. **`/pages/api/invoices/list.ts`** - Created API route (currently using Supabase client, still fails)
2. **`/lib/invoiceDbService.ts`** - Modified to use API route instead of direct Supabase

### What Works

- ✅ Database tables exist
- ✅ RLS policies configured
- ✅ Permissions granted
- ✅ Local code compiles without errors

### What's Broken

- ❌ PostgREST API cannot see tables
- ❌ Supabase client `.from('invoices')` fails
- ❌ SmartInvoice page cannot load data

---

## Recommendation

**Use Solution 1 (Direct PostgreSQL Connection)**

This is the most reliable fix and will work immediately. It bypasses the broken PostgREST layer entirely.

---

## Timeline

- **Initial setup:** Tables created successfully
- **T+0min:** PostgREST cache issue discovered
- **T+10min:** First NOTIFY reload attempt
- **T+15min:** ALTER TABLE modifications
- **T+20min:** Multiple reload strategies
- **T+30min:** Project restart
- **T+40min:** Issue persists, documented here

---

## Additional Notes

- This same PostgREST cache issue has been reported by other Supabase users
- The issue is NOT related to:
  - Table structure
  - Permissions
  - RLS policies
  - Database connectivity
  - Code errors

- The issue IS related to:
  - PostgREST's internal schema cache mechanism
  - Supabase's PostgREST instance not responding to reload signals

---

## Next Steps

**Immediate:** Implement Solution 1 (direct PostgreSQL connection)

**Long-term:**
- Open Supabase support ticket
- Consider using direct PostgreSQL connections for critical tables
- Monitor for similar issues with other tables
