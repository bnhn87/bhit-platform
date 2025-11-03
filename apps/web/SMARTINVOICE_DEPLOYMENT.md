# SmartInvoice Deployment Guide

## Overview

SmartInvoice is an AI-powered invoice management system for BHIT Work OS that automates invoice data extraction, tracking, and management for subcontractor invoices.

## Features Implemented

### Core Functionality
- ✅ **AI Invoice Processing**: Automatic extraction of invoice data using Gemini AI
- ✅ **File Upload & Storage**: Upload invoices (PDF/images) to Supabase Storage
- ✅ **Spreadsheet Interface**: Excel-like inline editing with real-time updates
- ✅ **Database Integration**: Full CRUD operations with Supabase
- ✅ **Real-time Sync**: Live updates across multiple users
- ✅ **Excel Export**: Export invoice data to XLSX format
- ✅ **Search & Filter**: Find invoices by supplier, category, date, etc.
- ✅ **Multi-category Support**: Vehicle, Labour, Materials, Other
- ✅ **VAT Calculation**: Automatic 20% UK VAT calculation
- ✅ **Approval Workflow**: Invoice approval system with audit trail
- ✅ **Supplier Management**: Track supplier details and payment terms

### User Interface
- ✅ **Glassmorphic Design**: Consistent with SmartQuote module styling
- ✅ **Loading States**: Progress indicators for uploads and data fetching
- ✅ **Error Handling**: User-friendly error notifications
- ✅ **Inline Editing**: Click to edit any cell in the spreadsheet
- ✅ **AI Confidence Indicators**: Visual feedback on extraction quality
- ✅ **Responsive Layout**: Works on desktop and tablet devices

## Files Created

### 1. Page Component
**`/pages/smart-invoice.tsx`**
- Main SmartInvoice workspace component
- Implements spreadsheet UI with glassmorphic styling
- Handles file uploads, editing, and export
- Integrates with database service

### 2. Database Service
**`/lib/invoiceDbService.ts`**
- Complete Supabase integration for invoices
- Functions: fetchInvoices, createInvoiceFromExtraction, updateInvoice, deleteInvoice
- File upload to Supabase Storage
- Real-time subscription support
- Invoice statistics and analytics

### 3. AI Service
**`/lib/invoiceAiService.ts`**
- ✅ Real Gemini AI integration (same API as SmartQuote)
- Uses `@google/genai` package
- Model: `gemini-2.5-flash`
- Structured JSON extraction with response schema
- Retry logic with 3 attempts
- Data validation and enrichment
- Learning system for user corrections

### 4. Database Migration
**`/migrations/041_invoice_system.sql`**
- Complete database schema for invoice system
- Tables: invoices, suppliers, invoice_line_items, invoice_corrections, invoice_approvals
- Row Level Security (RLS) policies
- Indexes for performance
- Views for analytics
- Triggers for automatic timestamps

### 5. Navigation
**`/components/NavBar.tsx`** (modified)
- Added "SmartInvoice" link for ops, director, and admin roles

## Database Schema

### Tables Created

#### `invoices`
Main invoice tracking table with AI extraction support
- Financial data (net, VAT, gross amounts)
- Status tracking (pending, approved, paid, rejected)
- AI metadata (confidence score, extracted text)
- Relationships to jobs, suppliers, organization

#### `suppliers`
Supplier/subcontractor information
- Contact details (name, email, phone, address)
- Banking details (account number, sort code)
- Payment terms and VAT number

#### `invoice_line_items`
Detailed line items for invoices (optional)
- Quantity, unit price, VAT rate
- Per-line amount calculations

#### `invoice_corrections`
AI learning system - tracks user corrections
- Original vs corrected values
- Supplier-specific patterns
- Used to improve future extractions

#### `invoice_approvals`
Audit trail of approvals/rejections
- Approver details
- Action (approved/rejected)
- Comments and timestamp

### Views

- **`invoice_summary`**: Combined view with joins for reporting
- **`invoice_stats_by_category`**: Aggregated statistics by category
- **`supplier_performance`**: Supplier spending and invoice counts

## Deployment Steps

### 1. Database Migration

Run the SQL migration in Supabase:

```bash
# Option 1: Via Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of migrations/041_invoice_system.sql
3. Paste and run the migration

# Option 2: Via CLI (if using Supabase CLI)
supabase db push migrations/041_invoice_system.sql
```

### 2. Storage Bucket Setup

Create storage bucket for invoice files:

```sql
-- In Supabase Dashboard → Storage
-- Create new bucket named "documents" if it doesn't exist
-- Set it to private (authenticated users only)

-- Apply storage policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: Users can upload to their organization folder
CREATE POLICY "Users can upload organization documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM users WHERE id = auth.uid()
  )
);

-- Policy: Users can read their organization documents
CREATE POLICY "Users can read organization documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM users WHERE id = auth.uid()
  )
);
```

### 3. Environment Variables

Ensure these are set in `.env.local`:

```bash
# Supabase (already configured)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Gemini AI (for invoice processing - REQUIRED)
# Use the same API key as SmartQuote
GEMINI_API_KEY=your_gemini_api_key
# OR
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
```

**Note:** SmartInvoice uses the same Gemini API configuration as SmartQuote. If you already have `GEMINI_API_KEY` or `NEXT_PUBLIC_GEMINI_API_KEY` set for SmartQuote, no additional configuration is needed.

### 5. Verify Access Permissions

Ensure user roles have access:

```sql
-- Verify users table has role column
SELECT id, email, role FROM users LIMIT 5;

-- Users should have role: 'ops', 'director', or 'admin' to access SmartInvoice
```

### 4. Test the Feature

1. **Login** as ops/director/admin user
2. **Navigate** to http://localhost:3002/smart-invoice
3. **Upload** a test invoice (PDF or image)
4. **Verify** Gemini AI extraction works:
   - Check confidence score indicator
   - Verify extracted data accuracy
   - Confirm VAT calculations (20%)
5. **Edit** invoice data inline
6. **Export** to Excel
7. **Delete** test invoice

**Note:** AI extraction requires a valid `GEMINI_API_KEY`. If not set, uploads will fail with an error message.

## User Roles & Permissions

### Access Levels

| Role | View | Create | Edit | Delete | Approve |
|------|------|--------|------|--------|---------|
| Guest | ❌ | ❌ | ❌ | ❌ | ❌ |
| Installer | ❌ | ❌ | ❌ | ❌ | ❌ |
| Supervisor | ❌ | ❌ | ❌ | ❌ | ❌ |
| Ops | ✅ | ✅ | ✅ | ✅ | ❌ |
| Director | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ |

### Row Level Security

All data is automatically scoped to the user's organization via RLS policies:
- Users can only see invoices from their organization
- Suppliers are shared across all organizations
- Corrections are visible to all users (for learning)

## Integration Points

### With Existing Features

1. **Jobs**: Invoices can be linked to specific jobs via `job_id`
2. **Dashboard**: Ready for integration with operations dashboard
3. **Reporting**: Views available for analytics and reporting
4. **User Management**: Respects existing role-based access control

### Future Enhancements

- [ ] **Email Notifications**: Send alerts for new invoices, approvals needed
- [ ] **Payment Integration**: Track payment status with accounting software
- [ ] **OCR Improvements**: Fine-tune AI extraction based on corrections
- [ ] **Batch Operations**: Approve/reject multiple invoices at once
- [ ] **Mobile App**: Mobile-optimized invoice capture and approval
- [ ] **Reporting Dashboard**: Visual analytics for invoice trends
- [ ] **Duplicate Detection**: AI-powered duplicate invoice detection

## API Endpoints

No additional API endpoints were created. All operations use:
- Supabase client-side SDK (already configured)
- Direct database queries via RLS
- Real-time subscriptions via Supabase

## Performance Considerations

### Indexes Created
- `idx_invoices_organization` - Filter by organization
- `idx_invoices_invoice_date` - Sort by date
- `idx_invoices_status` - Filter by status
- `idx_invoices_category` - Filter by category
- `idx_invoices_supplier` - Filter by supplier

### Optimization Tips
- Invoice list loads with pagination (ready for implementation)
- Real-time updates are debounced
- File uploads use progress tracking
- Images are compressed before upload (ready for implementation)

## Troubleshooting

### Common Issues

**1. "Failed to load invoices"**
- Check Supabase connection in browser console
- Verify migration ran successfully
- Check user has organization_id set

**2. "File upload failed"**
- Verify storage bucket exists
- Check storage policies are applied
- Ensure user is authenticated

**3. "AI extraction failed"**
- Check GOOGLE_AI_API_KEY is set
- Verify API quota not exceeded
- Check file format is supported

**4. Navigation link not showing**
- Verify user role is ops/director/admin
- Clear browser cache
- Check NavBar.tsx changes deployed

## Cost Estimates

### Supabase Storage
- ~1MB per invoice PDF
- 1000 invoices = ~1GB storage
- Supabase: First 1GB free

### Gemini AI API
- ~$0.001 per invoice extraction
- 1000 invoices = ~$1.00
- Google AI: Free tier available

## Security Checklist

- ✅ Row Level Security enabled on all tables
- ✅ File uploads scoped to organization
- ✅ User authentication required
- ✅ Role-based access control
- ✅ Audit trail for approvals
- ✅ SQL injection protection (via Supabase)
- ✅ XSS protection (via React)

## Support

For issues or questions:
1. Check browser console for errors
2. Verify database migration completed
3. Review Supabase logs
4. Check this documentation

## Version History

### v1.0.0 (Current)
- Initial SmartInvoice implementation
- ✅ Real Gemini AI integration (same API as SmartQuote)
- Database integration with real-time sync
- Excel export functionality
- Glassmorphic UI matching SmartQuote
- File upload to Supabase Storage
- Invoice approval workflow
- Supplier management

---

**Status**: ✅ Ready for Production Use

**AI Integration**: ✅ Complete (Gemini 2.5 Flash)

**Last Updated**: 2025-11-03

**Dependencies**: All installed (xlsx, date-fns, lucide-react, @supabase/supabase-js, @google/genai)
