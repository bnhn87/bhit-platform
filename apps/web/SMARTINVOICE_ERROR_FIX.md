# SmartInvoice Error Fix: "Failed to fetch invoices"

## Error Details

**Error Message:** `Failed to fetch invoices`
**Next.js Version:** 15.5.6 (Webpack)
**Component:** SmartInvoice page

---

## Root Cause

The "Failed to fetch invoices" error occurs because **SmartInvoice requires setup before it can work**. The system needs:

1. ✅ **Environment variables** - Supabase and Gemini API credentials
2. ✅ **Database migrations** - 11 tables need to be created
3. ✅ **Active Supabase project** - Database must be accessible

---

## Quick Fix (5 minutes)

### Step 1: Add Environment Variables

Create `.env.local` in the `apps/web` directory:

```bash
# REQUIRED: Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# REQUIRED: Gemini API for AI features
GEMINI_API_KEY=your-gemini-api-key-here

# OPTIONAL: Direct database connection (better performance)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.your-project.supabase.co:5432/postgres
```

**Where to find these values:**
- Supabase: Dashboard → Settings → API
- Gemini: https://makersuite.google.com/app/apikey
- Database URL: Dashboard → Settings → Database → Connection String

### Step 2: Deploy Database Migrations

**Option A: One-Click Deploy (Recommended)**

1. Open Supabase SQL Editor
2. Copy contents of `DEPLOY_SMARTINVOICE_MIGRATIONS.sql`
3. Paste and click **Run**
4. Wait for "SmartInvoice Migration Complete!" message

**Option B: Run Individual Migrations**

Run these files in order in Supabase SQL Editor:
1. `migrations/041_invoice_system.sql`
2. `migrations/042_document_templates.sql`
3. `migrations/043_active_learning.sql`

### Step 3: Restart Development Server

```bash
# Stop the server (Ctrl+C)
# Start again
npm run dev
```

### Step 4: Verify Setup

Visit: `http://localhost:3000/api/test-smartinvoice-setup`

You should see:
```json
{
  "success": true,
  "status": "SmartInvoice is ready to use! 🎉",
  "summary": {
    "total": 4,
    "passed": 4,
    "failed": 0,
    "warnings": 0
  }
}
```

---

## Detailed Troubleshooting

### Error: "Missing required environment variables"

**Problem:** `.env.local` file is missing or incomplete

**Solution:**
1. Create `.env.local` in `apps/web` directory
2. Add all required variables (see Step 1 above)
3. Restart the dev server

### Error: "relation 'invoices' does not exist"

**Problem:** Database migrations haven't been run

**Solution:**
1. Open Supabase SQL Editor
2. Run `DEPLOY_SMARTINVOICE_MIGRATIONS.sql`
3. Check for "SUCCESS ✓" message
4. Refresh your browser

### Error: "User not authenticated"

**Problem:** You're not logged in to the application

**Solution:**
1. Navigate to the login page
2. Sign in with your credentials
3. Return to SmartInvoice page

### Error: "GEMINI_API_KEY not set"

**Problem:** AI features require Gemini API key

**Solution:**
1. Get API key from https://makersuite.google.com/app/apikey
2. Add to `.env.local`: `GEMINI_API_KEY=your-key-here`
3. Restart dev server

### Error: API returns 500 error

**Problem:** Database connection or configuration issue

**Solution:**
1. Check server logs: `npm run dev`
2. Look for specific error messages
3. Verify environment variables are loaded
4. Check Supabase project is not paused
5. Try the setup verification API

---

## What Gets Created

After running the migrations, these 11 tables will exist:

### Core Tables:
- `suppliers` - Supplier/vendor information
- `invoices` - Main invoice records
- `invoice_line_items` - Detailed line-by-line breakdown
- `invoice_corrections` - User corrections for AI learning

### Document Markup:
- `document_templates` - Visual document layouts
- `template_fields` - Field coordinates on documents

### AI Learning:
- `active_learning_requests` - AI asks for help
- `learning_patterns` - Detected correction patterns
- `predicted_corrections` - AI-suggested fixes
- `anomaly_detections` - Suspicious invoice flags
- `validation_results` - Business logic validation

---

## Testing SmartInvoice

Once setup is complete:

1. **Navigate to SmartInvoice page**
   - Usually at `/smart-invoice` or `/invoices`

2. **Upload a test invoice**
   - Drag and drop a PDF invoice
   - Or click "Upload" button

3. **Watch the AI work**
   - Check browser console for logs:
     ```
     📄 Step 1/6: Extracting data with AI...
     🧠 Step 2/6: Applying learned patterns...
     ✅ Step 3/6: Validating extracted data...
     🔍 Step 4/6: Detecting anomalies...
     🔮 Step 5/6: Generating predictive corrections...
     🎓 Step 6/6: Preparing active learning data...
     ```

4. **Review extracted data**
   - Green dots (🟢) = High confidence (90-100%)
   - Yellow dots (🟡) = Medium confidence (70-89%)
   - Red dots (🔴) = Low confidence (<70%)

5. **Edit any mistakes**
   - Click cells to edit
   - Changes are saved automatically
   - AI learns from your corrections!

---

## Features After Setup

✅ **AI Invoice Extraction** - Gemini AI extracts all fields automatically
✅ **Confidence Scoring** - See how confident AI is about each field
✅ **Pattern Learning** - AI learns from your corrections
✅ **OCR Correction** - Common mistakes (O→0, I→1) fixed automatically
✅ **Smart Validation** - Business logic checks (VAT calculations, etc.)
✅ **Anomaly Detection** - Suspicious invoices flagged for review
✅ **Predictive Corrections** - AI suggests fixes before you see errors
✅ **Active Learning** - AI asks for help when uncertain
✅ **Visual Markup Tool** - Train AI on document layouts
✅ **Real-time Dashboard** - Monitor AI learning progress

---

## Architecture Overview

```
Upload Invoice
    ↓
📄 AI Extraction (Gemini)
    ↓
🧠 Pattern Application (Auto-fix OCR errors)
    ↓
✅ Smart Validation (Check business rules)
    ↓
🔍 Anomaly Detection (Flag suspicious invoices)
    ↓
🔮 Predictive Corrections (Suggest fixes)
    ↓
🎓 Active Learning (Create help requests)
    ↓
💾 Save to Database
    ↓
📈 AI Learns for Next Time
```

---

## Files Reference

- `SMARTINVOICE_SETUP_GUIDE.md` - Complete setup documentation
- `DEPLOY_SMARTINVOICE_MIGRATIONS.sql` - One-click database setup
- `SESSION_SUMMARY_WORLD_CLASS_AI.md` - Technical architecture details
- `pages/api/test-smartinvoice-setup.ts` - Setup verification endpoint

---

## Still Having Issues?

1. **Check the verification API:**
   ```
   http://localhost:3000/api/test-smartinvoice-setup
   ```

2. **Check server logs:**
   ```bash
   npm run dev
   ```
   Look for error messages in the console

3. **Check browser console:**
   - Open Developer Tools (F12)
   - Look for network errors or console errors

4. **Verify environment variables are loaded:**
   ```bash
   # In your dev server logs, you should NOT see:
   "Missing required environment variables"
   ```

5. **Check Supabase project status:**
   - Go to Supabase dashboard
   - Ensure project is not paused
   - Check API settings are correct

---

## Success Indicators

You'll know SmartInvoice is working when:

✅ `/api/test-smartinvoice-setup` returns success
✅ SmartInvoice page loads without errors
✅ You can see the invoice table/spreadsheet
✅ Upload button is clickable
✅ Test invoice uploads and processes successfully
✅ Console shows AI processing steps
✅ Extracted data appears in the table with confidence badges

---

## Summary

The "Failed to fetch invoices" error means **SmartInvoice needs setup**. Follow these steps:

1. ✅ Add environment variables to `.env.local`
2. ✅ Run `DEPLOY_SMARTINVOICE_MIGRATIONS.sql` in Supabase
3. ✅ Restart dev server
4. ✅ Test at `/api/test-smartinvoice-setup`
5. ✅ Start using SmartInvoice!

**Setup time:** ~5 minutes
**Result:** World-class AI invoice processing system! 🚀
