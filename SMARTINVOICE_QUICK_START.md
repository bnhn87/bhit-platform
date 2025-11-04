# SmartInvoice Quick Start

## 📄 SQL Migration File Location

The complete database migration file is now available at:

```
DEPLOY_SMARTINVOICE_MIGRATIONS.sql  (root directory - easy access!)
apps/web/DEPLOY_SMARTINVOICE_MIGRATIONS.sql  (original location)
```

---

## 🚀 Setup in 3 Steps (5 minutes)

### Step 1: Configure Environment Variables

Create `apps/web/.env.local`:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key
```

**Get credentials:**
- Supabase: Dashboard → Settings → API
- Gemini: https://makersuite.google.com/app/apikey

---

### Step 2: Deploy Database

**Copy the entire contents of:**
```
DEPLOY_SMARTINVOICE_MIGRATIONS.sql
```

**Paste into:**
1. Open Supabase dashboard
2. Click "SQL Editor"
3. Paste the SQL
4. Click "Run"

**You'll see:**
```
SmartInvoice Migration Complete!
Tables created: 11 / 11
Status: SUCCESS ✓
```

---

### Step 3: Verify & Test

```bash
# Restart dev server
npm run dev

# Visit this URL to verify setup:
http://localhost:3000/api/test-smartinvoice-setup
```

**Expected response:**
```json
{
  "success": true,
  "status": "SmartInvoice is ready to use! 🎉"
}
```

---

## 🎯 What Gets Created

**11 Database Tables:**
- suppliers
- invoices
- invoice_line_items
- invoice_corrections
- document_templates
- template_fields
- active_learning_requests
- learning_patterns
- predicted_corrections
- anomaly_detections
- validation_results

**Plus:**
- 20+ indexes
- RLS policies
- Auto-update triggers
- Verification checks

---

## 📚 More Documentation

- `SMARTINVOICE_ERROR_FIX.md` - Troubleshooting guide
- `SMARTINVOICE_SETUP_GUIDE.md` - Complete documentation
- `apps/web/SESSION_SUMMARY_WORLD_CLASS_AI.md` - Technical details

---

## ✅ Success Checklist

- [ ] `.env.local` created with all 3 environment variables
- [ ] `DEPLOY_SMARTINVOICE_MIGRATIONS.sql` run in Supabase
- [ ] Dev server restarted
- [ ] `/api/test-smartinvoice-setup` returns success
- [ ] Navigate to `/smart-invoice` page - no errors!

---

## 🔥 Start Using SmartInvoice

1. Go to `/smart-invoice` page
2. Upload a PDF invoice
3. Watch AI extract the data
4. See confidence badges (🟢🟡🔴)
5. Edit any mistakes
6. AI learns from your corrections!

**That's it! You're ready to go! 🚀**
