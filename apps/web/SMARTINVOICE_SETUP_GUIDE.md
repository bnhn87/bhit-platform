# SmartInvoice Setup Guide

## Issue: "Failed to fetch invoices" Error

This error occurs because the SmartInvoice system requires:
1. Environment variables configured
2. Database migrations deployed
3. Supabase connection established

---

## Step 1: Configure Environment Variables

Create or update `.env.local` file in the `apps/web` directory:

```bash
# Supabase Connection (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional: Direct PostgreSQL Connection (for better performance)
DATABASE_URL=postgresql://user:password@host:port/database?sslmode=require

# AI Configuration (REQUIRED for AI features)
GEMINI_API_KEY=your_gemini_api_key
# OR
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

### How to Get These Values:

#### Supabase Credentials:
1. Go to your Supabase project dashboard
2. Click **Settings** (gear icon)
3. Go to **API** section
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role key** (under "Project API keys") → `SUPABASE_SERVICE_ROLE_KEY`

#### Database URL (Optional but Recommended):
1. In Supabase dashboard, go to **Settings** → **Database**
2. Find **Connection String** section
3. Select **URI** format
4. Copy the connection string → `DATABASE_URL`
5. Replace `[YOUR-PASSWORD]` with your actual database password

#### Gemini API Key:
1. Go to https://makersuite.google.com/app/apikey
2. Create a new API key
3. Copy the key → `GEMINI_API_KEY`

---

## Step 2: Deploy Database Migrations

The SmartInvoice system requires 3 migrations to be deployed to your Supabase database.

### Option A: Deploy via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the sidebar
3. Run the following migrations **IN ORDER**:

#### Migration 1: Invoice System (041_invoice_system.sql)
```bash
# Copy the contents of apps/web/migrations/041_invoice_system.sql
```
- Creates `suppliers`, `invoices`, `invoice_line_items`, `invoice_corrections` tables
- Sets up indexes and RLS policies
- Creates triggers for automatic updates

#### Migration 2: Document Templates (042_document_templates.sql)
```bash
# Copy the contents of apps/web/migrations/042_document_templates.sql
```
- Creates `document_templates`, `template_fields` tables
- Enables visual document markup for AI training
- Sets up coordinate-based field recognition

#### Migration 3: Active Learning (043_active_learning.sql)
```bash
# Copy the contents of apps/web/migrations/043_active_learning.sql
```
- Creates 5 tables for AI learning systems:
  - `active_learning_requests`
  - `learning_patterns`
  - `predicted_corrections`
  - `anomaly_detections`
  - `validation_results`

### Option B: Deploy via PostgreSQL Client

If you have direct database access:

```bash
cd apps/web

# Run each migration in order
psql $DATABASE_URL -f migrations/041_invoice_system.sql
psql $DATABASE_URL -f migrations/042_document_templates.sql
psql $DATABASE_URL -f migrations/043_active_learning.sql
```

---

## Step 3: Verify Setup

### Check Database Tables:

Run this query in Supabase SQL Editor:

```sql
-- Check if all required tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'suppliers',
  'invoices',
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

**Expected Result:** All 10 tables should be listed.

### Check Environment Variables:

Create a test API route to verify:

```typescript
// pages/api/test-smartinvoice-setup.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Test Supabase connection
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .limit(1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message,
        hint: 'Supabase connection failed. Check your environment variables.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'SmartInvoice setup is correct!',
      environmentVariables: {
        supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        databaseUrl: !!process.env.DATABASE_URL,
        geminiApiKey: !!(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY)
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
```

Then visit: `http://localhost:3000/api/test-smartinvoice-setup`

---

## Step 4: Test SmartInvoice

1. Start the development server:
```bash
npm run dev
```

2. Navigate to SmartInvoice page (usually `/smart-invoice`)

3. Try uploading a test invoice PDF

4. Check the console for AI learning logs:
   - 📄 Step 1/6: Extracting data with AI...
   - 🧠 Step 2/6: Applying learned patterns...
   - ✅ Step 3/6: Validating extracted data...
   - 🔍 Step 4/6: Detecting anomalies...
   - 🔮 Step 5/6: Generating predictive corrections...
   - 🎓 Step 6/6: Preparing active learning data...

---

## Common Issues

### Issue: "Missing required environment variables"
**Solution:** Ensure `.env.local` exists and contains all required variables

### Issue: "relation 'invoices' does not exist"
**Solution:** Run the database migrations (Step 2)

### Issue: "User not authenticated"
**Solution:** Make sure you're logged in to the application

### Issue: "GEMINI_API_KEY not set"
**Solution:** Add Gemini API key to `.env.local`

### Issue: API returns 500 error
**Solution:**
1. Check server logs: `npm run dev`
2. Verify environment variables are loaded
3. Restart the development server
4. Check Supabase project is not paused

---

## Architecture Overview

### SmartInvoice System Components:

1. **AI Extraction** (`lib/invoiceAiService.ts`)
   - Uses Gemini AI to extract invoice data
   - Returns per-field confidence scores

2. **Smart Processor** (`lib/smartInvoiceProcessor.ts`)
   - Orchestrates all AI learning systems
   - Applies patterns, validates, detects anomalies

3. **Database Service** (`lib/invoiceDbService.ts`)
   - Handles all database operations
   - Records corrections for learning

4. **AI Learning Engine** (`lib/aiLearningEngine.ts`)
   - Pattern detection
   - Active learning
   - Anomaly detection
   - Smart validation
   - Predictive corrections

5. **API Routes** (`pages/api/invoices/*.ts`)
   - RESTful endpoints for invoice operations
   - Bypasses PostgREST for better performance

6. **UI Components** (`pages/smart-invoice.tsx`)
   - Spreadsheet-style invoice table
   - Real-time AI confidence badges
   - Upload and edit functionality

---

## Features Enabled After Setup

✅ **AI Invoice Extraction** - Automatic data extraction from PDF invoices
✅ **Confidence Scoring** - Per-field confidence indicators
✅ **Pattern Learning** - AI learns from corrections automatically
✅ **OCR Correction** - Common OCR mistakes fixed automatically
✅ **Smart Validation** - Business logic validation (VAT, amounts, dates)
✅ **Anomaly Detection** - Suspicious invoices flagged automatically
✅ **Predictive Corrections** - AI suggests fixes before you see them
✅ **Active Learning** - AI asks for help when uncertain
✅ **Visual Markup Tool** - Train AI on document layouts
✅ **Real-time Learning Dashboard** - Monitor AI performance

---

## Need Help?

If you're still experiencing issues:

1. Check the server logs: `npm run dev`
2. Open browser console for frontend errors
3. Verify all environment variables are set correctly
4. Ensure all migrations have been run
5. Check Supabase dashboard for any error logs

For more details on the AI learning systems, see: `SESSION_SUMMARY_WORLD_CLASS_AI.md`
