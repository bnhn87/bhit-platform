# Full Supabase Code Audit - SmartInvoice

## 🔍 Issue Identified

**Problem:** The test endpoint uses `supabaseAdmin.from('invoices')` which hits Supabase's PostgREST schema cache. The cache is stale and doesn't know about newly created tables.

**Location:** `apps/web/pages/api/test-smartinvoice-setup.ts` line 77-80

---

## 📊 Current Architecture

### Supabase Clients

**1. supabaseClient.ts (Client-side)**
```typescript
- Uses: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
- Purpose: Frontend auth and queries
- Issue: ⚠️ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
```

**2. supabaseAdmin.ts (Server-side)**
```typescript
- Uses: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
- Purpose: Server-side queries, bypasses RLS
- Issue: ✅ Configured correctly, but hits PostgREST cache
```

### Database Connection Methods

**Method 1: Direct PostgreSQL (DATABASE_URL)**
- ✅ Bypasses PostgREST completely
- ✅ No cache issues
- ✅ Faster performance
- ✅ Used by `/api/invoices/list`
- ❌ NOT used by `/api/test-smartinvoice-setup`

**Method 2: Supabase Admin Client**
- ❌ Goes through PostgREST
- ❌ Subject to schema cache issues
- ❌ Currently showing stale cache
- ✅ Used as fallback in `/api/invoices/list`
- ❌ Primary method in `/api/test-smartinvoice-setup`

---

## 🔧 Files That Need Fixes

### 1. `/apps/web/pages/api/test-smartinvoice-setup.ts`

**Current code (BROKEN):**
```typescript
// Line 77-80
const { error: connectionError } = await supabaseAdmin
  .from('invoices')
  .select('id')
  .limit(1);
```

**Issue:** Uses Supabase PostgREST which has stale cache

**Fix:** Use direct PostgreSQL connection like the list API does

---

### 2. `.env.local` Configuration

**Missing variables:**
```bash
# Currently missing - needed for frontend
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**Has these (correct):**
```bash
NEXT_PUBLIC_SUPABASE_URL=configured ✅
SUPABASE_SERVICE_ROLE_KEY=configured ✅
DATABASE_URL=configured ✅
GEMINI_API_KEY=configured ✅
```

---

## 📝 All Supabase Calls in SmartInvoice

### Working Correctly ✅

**1. `/api/invoices/list.ts`**
```typescript
// Lines 33-42: Tries DATABASE_URL first
if (process.env.DATABASE_URL) {
  const result = await getPool()?.query(
    'SELECT * FROM invoices ORDER BY invoice_date DESC'
  );
  return res.status(200).json(result?.rows || []);
}

// Lines 46-54: Falls back to Supabase
const { data, error } = await supabaseAdmin
  .from('invoices')
  .select('*')
```

**Why it works:** Prioritizes DATABASE_URL (direct connection)

---

### Broken ❌

**2. `/api/test-smartinvoice-setup.ts`**
```typescript
// Lines 77-80: Only uses Supabase (no DATABASE_URL fallback)
const { error: connectionError } = await supabaseAdmin
  .from('invoices')
  .select('id')
  .limit(1);
```

**Why it's broken:** Only uses PostgREST (stale cache)

**Fix needed:** Add DATABASE_URL connection attempt first

---

**3. `/lib/invoiceDbService.ts - createInvoiceFromExtraction()`**
```typescript
// Lines 192-196: Direct Supabase query
const { data: existingSupplier } = await supabaseAdmin
  .from('suppliers')
  .select('id')
  .eq('name', extractedData.supplier)
  .maybeSingle();

// Lines 202-210: Insert supplier
const { data: newSupplier } = await supabaseAdmin
  .from('suppliers')
  .insert({ name: extractedData.supplier, ... })

// Lines 241-246: Insert invoice
const { data, error } = await supabaseAdmin
  .from('invoices')
  .insert(invoiceData)
```

**Why it might fail:** All use PostgREST with stale cache

**Fix needed:** These should work once cache is refreshed, but ideally use DATABASE_URL

---

## 🎯 Root Cause Analysis

### The Schema Cache Problem

**What's happening:**
1. You created tables in PostgreSQL ✅
2. Supabase PostgREST cached the schema BEFORE tables existed ❌
3. PostgREST still thinks tables don't exist ❌
4. Cache needs manual refresh

**Why DATABASE_URL works:**
- Bypasses PostgREST entirely
- Connects directly to PostgreSQL
- No cache involved
- Always sees current schema

**Why supabaseAdmin fails:**
- Goes through PostgREST API layer
- PostgREST has cached schema
- Cache says "invoices table doesn't exist"
- Returns error

---

## ✅ Solutions (In Order of Priority)

### Solution 1: Fix test-smartinvoice-setup.ts (IMMEDIATE)

Update the test endpoint to use DATABASE_URL first, just like the list API.

**Why:** Fixes the test endpoint immediately without waiting for cache refresh

---

### Solution 2: Refresh PostgREST Schema Cache

**Method A: SQL Command**
```sql
NOTIFY pgrst, 'reload schema';
```

**Method B: Restart PostgREST**
- Supabase Dashboard → Settings → API → Restart

**Method C: Wait 10-30 minutes**
- Cache may auto-refresh

**Why:** Fixes all supabaseAdmin calls

---

### Solution 3: Add Missing Environment Variable

Add to `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Get it from: Supabase Dashboard → Settings → API → Project API keys → anon public

**Why:** Required for frontend supabase client to work

---

### Solution 4: Update All Database Writes

Modify `invoiceDbService.ts` to use DATABASE_URL for writes when available.

**Why:** Long-term solution, avoids PostgREST entirely

---

## 📊 Call Flow Diagram

### Current (Broken)

```
Frontend (smart-invoice.tsx)
    ↓
lib/invoiceDbService.ts (fetchInvoices)
    ↓
API /api/invoices/list
    ↓
DATABASE_URL → PostgreSQL ✅ WORKS!

BUT:

Test Endpoint
    ↓
supabaseAdmin.from('invoices')
    ↓
PostgREST (stale cache) ❌ FAILS!
```

### After Fix

```
All Endpoints
    ↓
1. Try DATABASE_URL first → PostgreSQL ✅
    ↓ (if fails)
2. Try supabaseAdmin → PostgREST (refreshed cache) ✅
```

---

## 🔍 Environment Variables Checklist

### Required for SmartInvoice:

- [x] `NEXT_PUBLIC_SUPABASE_URL` - ✅ Configured
- [x] `SUPABASE_SERVICE_ROLE_KEY` - ✅ Configured
- [x] `DATABASE_URL` - ✅ Configured
- [x] `GEMINI_API_KEY` - ✅ Configured
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - ⚠️ MISSING (needed for frontend)

---

## 🎯 Immediate Action Items

1. **Run in Supabase SQL Editor:**
   ```sql
   NOTIFY pgrst, 'reload schema';
   SELECT COUNT(*) FROM invoices; -- Should work!
   ```

2. **Add to .env.local:**
   ```bash
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_from_dashboard
   ```

3. **Apply the test endpoint fix** (see next file)

4. **Restart dev server:**
   ```bash
   npm run dev
   ```

5. **Test:**
   ```
   http://localhost:3000/api/test-smartinvoice-setup
   ```

---

## 📈 Success Criteria

After fixes:
- ✅ Test endpoint returns success
- ✅ SmartInvoice page loads
- ✅ Can upload invoices
- ✅ Can view/edit invoice data
- ✅ AI extraction works

---

## 💡 Why This Wasn't Caught Earlier

The `/api/invoices/list` endpoint was designed with the DATABASE_URL fallback from the start, so it worked. But the test endpoint was written later and didn't include this fallback, exposing the cache issue.

**Lesson:** All Supabase queries should try DATABASE_URL first when available.
