# Troubleshoot: SmartInvoice Not Working Locally

## ✅ Good News: Migration Successful!

Your database is set up correctly in Supabase. The issue is the **local app can't connect** to it.

---

## 🔍 Most Common Cause: Missing Environment Variables

### Step 1: Check if .env.local Exists

**Run this on YOUR LOCAL MACHINE:**
```bash
cd apps/web
ls -la .env.local
```

**If you get "No such file or directory"** → You need to create it!

---

## ✅ SOLUTION: Create .env.local File

### Step 1: Create the File

**On your local machine, in `apps/web/` directory:**

Create a new file called `.env.local` with this content:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Gemini API (for AI invoice extraction)
GEMINI_API_KEY=your_gemini_api_key_here

# Optional: Direct database connection (better performance)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project-ref.supabase.co:5432/postgres
```

### Step 2: Get Your Actual Values

**Go to Supabase Dashboard:**
1. Open: https://supabase.com/dashboard
2. Select your project
3. Click **Settings** (gear icon)
4. Click **API**

**Copy these values:**

**NEXT_PUBLIC_SUPABASE_URL:**
- Look for "Project URL"
- Example: `https://abcdefghijk.supabase.co`

**SUPABASE_SERVICE_ROLE_KEY:**
- Look for "Project API keys" section
- Find "service_role" (secret key)
- Click "Reveal" and copy
- ⚠️ Keep this secret!

**GEMINI_API_KEY:**
- Go to: https://makersuite.google.com/app/apikey
- Create API key
- Copy the key

**DATABASE_URL (Optional but recommended):**
- In Supabase Dashboard: Settings → Database
- Find "Connection string" section
- Select "URI" format
- Copy and replace `[YOUR-PASSWORD]` with your actual database password

### Step 3: Save and Restart

1. **Save** the `.env.local` file
2. **Stop your dev server** (Ctrl+C)
3. **Restart:**
   ```bash
   npm run dev
   ```

---

## 🧪 Test the Connection

### Method 1: Visit Setup Check API

Open in browser:
```
http://localhost:3000/api/test-smartinvoice-setup
```

**Expected (Success):**
```json
{
  "success": true,
  "status": "SmartInvoice is ready to use! 🎉",
  "summary": {
    "passed": 4,
    "failed": 0
  }
}
```

**If it fails:**
- Check environment variables are correct
- Make sure no typos in URLs/keys
- Ensure file is named exactly `.env.local` (not `.env` or `.env.local.txt`)

### Method 2: Visit SmartInvoice Page

Open in browser:
```
http://localhost:3000/smart-invoice
```

**Expected:**
- Page loads without errors
- You see the invoice table/spreadsheet
- No "relation does not exist" errors

---

## ⚠️ Common Issues

### Issue 1: "Missing required environment variables"

**Problem:** `.env.local` doesn't exist or has wrong variable names

**Solution:**
1. Make sure file is named exactly `.env.local`
2. Check variable names match exactly (case-sensitive)
3. Restart dev server after creating file

### Issue 2: "Failed to fetch invoices" or "relation does not exist"

**Problem:** Environment variables are wrong or Supabase connection failing

**Solution:**
1. Double-check `NEXT_PUBLIC_SUPABASE_URL` is correct
2. Verify `SUPABASE_SERVICE_ROLE_KEY` is the service_role key (not anon key)
3. Test connection by visiting `/api/test-smartinvoice-setup`

### Issue 3: Page loads but can't upload invoices

**Problem:** Missing Gemini API key

**Solution:**
1. Get API key from https://makersuite.google.com/app/apikey
2. Add to `.env.local`: `GEMINI_API_KEY=your_key`
3. Restart dev server

### Issue 4: Changes not taking effect

**Problem:** Dev server needs restart or browser cache

**Solution:**
1. Stop dev server (Ctrl+C)
2. Start again: `npm run dev`
3. Hard refresh browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
4. Try incognito/private window

---

## 📋 Verification Checklist

Run through this checklist:

- [ ] Migration ran successfully in Supabase (you already did this ✅)
- [ ] `.env.local` file exists in `apps/web/` directory
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set and correct
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set and correct
- [ ] `GEMINI_API_KEY` is set
- [ ] Dev server has been restarted after creating `.env.local`
- [ ] `/api/test-smartinvoice-setup` returns success
- [ ] `/smart-invoice` page loads without errors

---

## 🎯 Quick Test Commands

**Check if .env.local exists:**
```bash
cd apps/web
cat .env.local
```

**Check what variables are set:**
```bash
# Should show your URLs without revealing full keys
grep "SUPABASE_URL" apps/web/.env.local
grep "SERVICE_ROLE" apps/web/.env.local
grep "GEMINI" apps/web/.env.local
```

**Restart dev server:**
```bash
# Stop current server (Ctrl+C)
npm run dev
```

**Test connection:**
```bash
# Should return JSON with success status
curl http://localhost:3000/api/test-smartinvoice-setup
```

---

## 💡 Still Not Working?

If you've done all the above and it still doesn't work:

### Check Server Logs

Look at your terminal where `npm run dev` is running. Check for:
- Red error messages
- "Missing environment variables" warnings
- Connection errors

### Check Browser Console

Open browser DevTools (F12) and look for:
- Red errors in Console tab
- Network tab showing failed requests (look for 500 errors)

### Common Error Messages:

**"Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL"**
→ `.env.local` file is missing or not in the right location

**"Failed to fetch"**
→ Supabase URL or keys are wrong

**"relation 'invoices' does not exist"**
→ Migration didn't run or connected to wrong database

---

## 📁 File Structure Check

Make sure your files are in the right place:

```
bhit-platform/
├── apps/
│   └── web/
│       ├── .env.local          ← THIS FILE MUST EXIST
│       ├── .env.example        ← Template (don't edit this)
│       ├── pages/
│       │   └── smart-invoice.tsx
│       └── package.json
```

---

## 🚀 Expected Behavior After Fix

Once everything is configured:

1. **Dev server starts without errors**
2. **Visit `/api/test-smartinvoice-setup`** → Success message
3. **Visit `/smart-invoice`** → Page loads with empty invoice table
4. **Upload test invoice** → AI extracts data automatically
5. **See confidence badges** (🟢🟡🔴) on extracted fields

---

## 📞 Summary

**Your database is fine!** ✅ (Migration ran successfully)

**The issue:** Local app can't connect to Supabase

**Most likely cause:** Missing `.env.local` file

**Fix:** Create `.env.local` in `apps/web/` with correct Supabase credentials

**After fix:** Restart dev server and test at `/api/test-smartinvoice-setup`

You're almost there! Just need to connect your local app to Supabase. 🎉
