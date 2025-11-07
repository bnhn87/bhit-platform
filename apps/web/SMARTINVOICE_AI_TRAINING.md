# SmartInvoice AI Training System - Complete Design

## Executive Summary

**Problem**: AI invoice extraction makes mistakes. Currently there's no way to systematically improve the AI by learning from user corrections.

**Solution**: Build an AI Training System that captures corrections, analyzes patterns, and provides feedback to improve extraction accuracy over time.

**Impact**:
- Reduce manual corrections by 70-90% over 3 months
- Improve AI confidence scores from 65% avg → 90%+ avg
- Save 15+ hours/month on invoice data entry
- Supplier-specific learning (learns each supplier's invoice format)

---

## Current State Analysis

### ✅ Database Infrastructure (Already Exists!)

The `invoice_corrections` table is already in place:
```sql
CREATE TABLE IF NOT EXISTS invoice_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  original_value TEXT,
  corrected_value TEXT,
  corrected_by UUID NOT NULL REFERENCES users(id),
  corrected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL
);
```

**What we have**:
- ✅ Corrections tracking table with indexes
- ✅ RLS policies (users can view all, insert their own)
- ✅ Confidence score field on invoices
- ✅ Extracted text storage
- ✅ Supplier relationship for pattern analysis

### ❌ What's Missing

- UI to easily correct AI extraction errors
- Visual comparison of AI vs. corrected values
- Confidence indicators per field
- Training dashboard showing improvement metrics
- Bulk correction for similar invoices
- Export corrections for AI fine-tuning

---

## Proposed AI Training Features

### Phase 1: Correction Interface (Essential)

#### 1.1 Field-Level Confidence Indicators
Show AI confidence for each extracted field with color coding:
- 🟢 Green (90-100%): High confidence - rarely needs correction
- 🟡 Yellow (70-89%): Medium confidence - review recommended
- 🔴 Red (<70%): Low confidence - likely needs correction

```tsx
<div className="invoice-field">
  <span className="field-label">Invoice Number</span>
  <input value="INV-2024-001" />
  <ConfidenceBadge score={95} /> {/* Green */}
</div>
```

#### 1.2 Quick Correction Mode
One-click mode to review and correct low-confidence fields:
- Only shows fields with confidence < 80%
- Tab through corrections rapidly
- Keyboard shortcuts (Enter to accept, Tab to next)
- Auto-save corrections to invoice_corrections table

#### 1.3 Before/After Comparison View
Side-by-side view showing what AI extracted vs. what user corrected:
```
┌─────────────────────────────────────────────────────┐
│ Field: Invoice Number                               │
│ ┌─────────────────┐  ┌─────────────────┐           │
│ │ AI Extracted    │  │ User Corrected  │           │
│ │ INV-2O24-001    │→ │ INV-2024-001    │           │
│ │ (0 vs O)        │  │ (0 not O)       │           │
│ └─────────────────┘  └─────────────────┘           │
│ Confidence: 72% 🟡                                  │
└─────────────────────────────────────────────────────┘
```

#### 1.4 Smart Suggestions
AI suggests likely corrections based on:
- Past corrections for same supplier
- Common OCR mistakes (0 vs O, 1 vs I, etc.)
- Expected data formats (dates, invoice numbers)

---

### Phase 2: Training Analytics Dashboard (High Value)

#### 2.1 AI Improvement Metrics
Track and visualize AI accuracy over time:

```
┌────────────────────────────────────────────────────┐
│ AI Training Progress                               │
│                                                    │
│ Overall Accuracy:  87.3% ↑ +12.1%                │
│ Avg Confidence:    82.5% ↑ +15.3%                │
│                                                    │
│ Month-over-Month Improvement:                     │
│ ▁▂▃▅▆▇█  (trending up)                           │
│                                                    │
│ Fields Needing Most Training:                     │
│ 1. Invoice Date       → 156 corrections          │
│ 2. Supplier Name      → 142 corrections          │
│ 3. Net Amount         → 98 corrections           │
└────────────────────────────────────────────────────┘
```

#### 2.2 Supplier-Specific Learning
Show which suppliers' invoices are hardest to extract:

| Supplier | Total Invoices | Corrections | Accuracy | Status |
|----------|----------------|-------------|----------|--------|
| ABC Motors | 245 | 12 | 95.1% | 🟢 Excellent |
| XYZ Parts | 189 | 89 | 52.9% | 🔴 Needs Training |
| LMN Services | 156 | 23 | 85.3% | 🟡 Good |

**Action**: For low-accuracy suppliers, suggest:
- Requesting digital invoices instead of scanned
- Creating supplier-specific templates
- Manual review required before approval

#### 2.3 Correction Patterns Analysis
Identify common correction patterns:

```
Common Mistakes:
1. Date Format: AI extracts MM/DD/YYYY, users correct to DD/MM/YYYY (UK format)
   → Solution: Update AI prompt to expect UK date format

2. Invoice Numbers: AI confuses "0" with "O" in serif fonts
   → Solution: Add OCR post-processing rule

3. Amounts: AI misses decimal points in handwritten invoices
   → Solution: Flag handwritten amounts for manual review
```

#### 2.4 Training Export
Export corrections in format suitable for AI fine-tuning:
```json
{
  "training_data": [
    {
      "invoice_id": "...",
      "supplier": "ABC Motors",
      "original_extraction": {...},
      "corrected_values": {...},
      "fields_corrected": ["invoice_number", "date"],
      "confidence_scores": {...}
    }
  ]
}
```

---

### Phase 3: Advanced Training Features (Future)

#### 3.1 Bulk Pattern Correction
Apply correction to all similar invoices:
```
Found 15 invoices where AI extracted "0" instead of "O"
Apply fix to all? [Yes] [Review Each]
```

#### 3.2 Custom Training Rules
Let users define rules:
- "For supplier XYZ, invoice number is always in top-right corner"
- "For supplier ABC, ignore bottom section (it's advertising)"
- "Date format is always DD/MM/YYYY for UK suppliers"

#### 3.3 Active Learning
AI requests human review for uncertain extractions:
```
┌─────────────────────────────────────────────────┐
│ 🧠 AI Training Request                          │
│                                                 │
│ I'm 68% confident this is the invoice number:  │
│ "INV-2O24-001"                                  │
│                                                 │
│ Could you verify? This will help me learn.     │
│ [Correct] [Wrong - it's: _______]              │
└─────────────────────────────────────────────────┘
```

#### 3.4 Confidence Score Explanation
Show why AI has low confidence:
- "Multiple date-like fields found (ambiguous)"
- "Invoice number format doesn't match supplier's usual pattern"
- "Poor image quality in this region"
- "First invoice from new supplier (no training data)"

---

## Implementation Plan

### Phase 1: Core Correction Interface (Week 1)

**Tasks**:
1. ✅ Add confidence score to invoice extraction (already in DB schema)
2. Create `recordCorrection()` function in invoiceDbService
3. Add confidence badges to invoice table cells
4. Implement inline field correction with auto-save
5. Create correction history modal
6. Add keyboard shortcuts for quick correction

**Files to Modify**:
- `/lib/invoiceDbService.ts` - Add recordCorrection()
- `/pages/smart-invoice.tsx` - Add confidence UI + correction modal
- `/lib/invoiceAiService.ts` - Return confidence scores per field

**UI Components**:
```tsx
// Confidence Badge
<ConfidenceBadge score={85} />  // Shows colored indicator

// Correction Modal
<CorrectionModal
  invoice={selectedInvoice}
  onSaveCorrection={(field, oldValue, newValue) => {
    recordCorrection(invoice.id, field, oldValue, newValue);
  }}
/>

// Low Confidence Filter
<Button onClick={() => filterByConfidence('low')}>
  Show Only Low Confidence Fields (23)
</Button>
```

### Phase 2: Training Analytics (Week 2)

**Tasks**:
1. Create training analytics queries
2. Build Training Dashboard page
3. Show supplier-specific accuracy
4. Display correction trends over time
5. Export training data feature

**New Files**:
- `/pages/smart-invoice-training.tsx` - Training dashboard
- `/lib/invoiceTrainingService.ts` - Analytics queries
- `/api/invoices/training-export.ts` - Export endpoint

**Database Queries**:
```typescript
// Get overall accuracy
async function getOverallAccuracy() {
  const totalInvoices = await countInvoices();
  const totalCorrections = await countCorrections();
  return 100 - (totalCorrections / (totalInvoices * 12)); // 12 fields avg
}

// Get corrections by field
async function getCorrectionsByField() {
  return supabaseAdmin
    .from('invoice_corrections')
    .select('field_name')
    .then(group by field_name, count);
}

// Get supplier accuracy
async function getSupplierAccuracy(supplierId) {
  const invoices = await getInvoicesBySupplier(supplierId);
  const corrections = await getCorrectionsBySupplier(supplierId);
  return calculateAccuracy(invoices, corrections);
}
```

### Phase 3: Advanced Features (Week 3)

**Tasks**:
1. Pattern detection algorithm
2. Bulk correction system
3. Active learning prompts
4. Custom training rules UI
5. Confidence explanation tooltips

---

## Technical Architecture

### Data Flow

```
┌─────────────┐
│ Upload PDF  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│ AI Extraction           │
│ (returns confidence per │
│  field)                 │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Show in UI with         │
│ confidence indicators   │
└──────┬──────────────────┘
       │
       ▼ (user corrects)
┌─────────────────────────┐
│ Save to                 │
│ invoice_corrections     │
└──────┬──────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Analytics Dashboard     │
│ (track improvements)    │
└─────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│ Export for AI           │
│ fine-tuning             │
└─────────────────────────┘
```

### Database Service Functions

```typescript
// Record a correction
export async function recordCorrection(
  invoiceId: string,
  fieldName: string,
  originalValue: string,
  correctedValue: string
): Promise<void>

// Get correction history for invoice
export async function getCorrectionHistory(
  invoiceId: string
): Promise<InvoiceCorrection[]>

// Get training statistics
export async function getTrainingStats(): Promise<{
  totalCorrections: number;
  correctionsByField: Record<string, number>;
  correctionsBySupplier: Record<string, number>;
  accuracyTrend: Array<{ date: string; accuracy: number }>;
}>

// Get low-confidence invoices
export async function getLowConfidenceInvoices(
  threshold: number = 80
): Promise<Invoice[]>

// Export training data
export async function exportTrainingData(
  dateRange?: { start: Date; end: Date }
): Promise<TrainingDataExport>
```

---

## UI/UX Design

### 1. Confidence Indicators in Table

```
┌──────────────────────────────────────────────────────────────────┐
│ Invoice Number      │ Date         │ Supplier      │ Amount      │
├──────────────────────────────────────────────────────────────────┤
│ INV-2024-001 🟢     │ 2024-01-15 🟢│ ABC Motors 🟢│ £1,234.56 🟢│
│ INV-2O24-002 🔴     │ 2024-01-16 🟡│ XYZ Parts 🟢 │ £987.65 🟡 │
│ INV-2024-003 🟢     │ 15/01/2024 🔴│ LMN Co 🟡    │ £2,345.67 🟢│
└──────────────────────────────────────────────────────────────────┘
                                              Legend: 🟢>90% 🟡70-90% 🔴<70%
```

### 2. Correction Modal

```
┌─────────────────────────────────────────────────────────────────┐
│ ✏️  Correct Invoice Extraction                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Invoice Number                                 Confidence: 68%  │
│ ┌────────────────┐                            ┌──────────────┐ │
│ │ AI Extracted   │                            │ Your Value   │ │
│ │ INV-2O24-002   │  →  Click to correct  →   │ INV-2024-002 │ │
│ └────────────────┘                            └──────────────┘ │
│                                                                 │
│ Invoice Date                                   Confidence: 85%  │
│ ┌────────────────┐                            ┌──────────────┐ │
│ │ 2024-01-16     │  ✓  Looks correct         │ 2024-01-16   │ │
│ └────────────────┘                            └──────────────┘ │
│                                                                 │
│ Supplier Name                                  Confidence: 92%  │
│ ┌────────────────┐                            ┌──────────────┐ │
│ │ XYZ Parts Ltd  │  ✓  Looks correct         │ XYZ Parts Ltd│ │
│ └────────────────┘                            └──────────────┘ │
│                                                                 │
│ [Skip Low Confidence Only] [Save All Corrections]              │
└─────────────────────────────────────────────────────────────────┘
```

### 3. Training Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ 🧠 AI Training Dashboard                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─────────────────────┐  ┌─────────────────────┐              │
│ │ Overall Accuracy    │  │ Avg Confidence      │              │
│ │   87.3% ↑ +12.1%   │  │   82.5% ↑ +15.3%   │              │
│ └─────────────────────┘  └─────────────────────┘              │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Accuracy Trend (Last 3 Months)                              ││
│ │ 100% ┤                                                   ╭── ││
│ │  80% ┤                                         ╭────────╯    ││
│ │  60% ┤                           ╭────────────╯              ││
│ │  40% ┤             ╭────────────╯                            ││
│ │  20% ┤   ╭────────╯                                          ││
│ │   0% └───┴────┴────┴────┴────┴────┴────┴────┴────┴────┴──── ││
│ │      Oct      Nov      Dec      Jan      Feb      Mar        ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ Fields Needing Most Attention:                                 │
│ ┌──────────────────────────────────────────────────────┐       │
│ │ Field Name       │ Corrections │ Accuracy │ Status   │       │
│ ├──────────────────────────────────────────────────────┤       │
│ │ Invoice Date     │ 156        │ 68.2%    │ 🔴 Poor   │       │
│ │ Supplier Name    │ 142        │ 71.5%    │ 🟡 Fair   │       │
│ │ Net Amount       │ 98         │ 82.1%    │ 🟡 Good   │       │
│ │ Invoice Number   │ 45         │ 91.3%    │ 🟢 Great  │       │
│ └──────────────────────────────────────────────────────┘       │
│                                                                 │
│ [Export Training Data] [View Correction History]               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

### Immediate (Week 1)
- ✅ Users can see confidence scores for all fields
- ✅ Users can correct fields with 1 click
- ✅ Corrections automatically saved to database

### Short-term (Month 1)
- 🎯 80% of low-confidence fields get corrected
- 🎯 Average time to review invoice: 45 sec → 20 sec
- 🎯 100+ corrections recorded (training data growing)

### Medium-term (Month 3)
- 🎯 AI accuracy improves from 65% → 85%
- 🎯 Confidence scores increase from 70% avg → 85% avg
- 🎯 50% reduction in fields requiring correction
- 🎯 Supplier-specific patterns identified for top 10 suppliers

### Long-term (Month 6+)
- 🎯 AI accuracy reaches 90%+ for known suppliers
- 🎯 95% of invoices require zero manual corrections
- 🎯 New supplier accuracy: 75%+ on first invoice
- 🎯 Training data exported and used for AI fine-tuning

---

## Additional Features to Consider

Beyond the AI training system, here are other high-value features we could add:

### 1. Invoice Matching to Jobs/Quotes
**Why**: Connect invoices to the work they're for
**Impact**: Track job profitability, compare quote vs. actual costs
```tsx
<InvoiceJobLinker
  invoice={invoice}
  jobs={availableJobs}
  onLink={(jobId) => linkInvoiceToJob(invoice.id, jobId)}
/>
```

### 2. Automated Payment Scheduling
**Why**: Never miss a payment deadline, optimize cash flow
**Impact**: Avoid late fees, maintain supplier relationships
```tsx
<PaymentSchedule>
  - Due in 3 days: £12,450 (5 invoices)
  - Due next week: £8,900 (3 invoices)
  - Overdue: £2,100 (1 invoice) 🔴
</PaymentSchedule>
```

### 3. Supplier Performance Scoring
**Why**: Know which suppliers are reliable, good value, deliver on time
**Impact**: Better supplier selection, negotiate better terms
```tsx
<SupplierScorecard supplier="ABC Motors">
  - Average invoice accuracy: 95% 🟢
  - Price competitiveness: 4.2/5 ⭐
  - On-time delivery: 92%
  - Total spent YTD: £45,670
</SupplierScorecard>
```

### 4. Smart Category Auto-Assignment
**Why**: AI learns to categorize invoices automatically
**Impact**: Saves time, ensures consistent categorization
```typescript
// AI learns: "ABC Tyres" → always "Vehicle" category
// AI learns: "Bob's Painting" → always "Labour" category
```

### 5. Multi-Currency Support
**Why**: Work with international suppliers
**Impact**: Expand supplier options, accurate accounting
```tsx
<InvoiceAmount>
  Original: €1,200 EUR
  Converted: £1,050 GBP (rate: 1.14)
  Date: 2024-01-15
</InvoiceAmount>
```

### 6. OCR Improvement with User Feedback
**Why**: Current OCR might misread fonts, handwriting
**Impact**: Higher extraction accuracy, fewer corrections
```tsx
// User marks regions on invoice:
"Invoice number is always in this box ▭"
"Ignore this footer section (it's ads)"
```

### 7. Invoice Approval Workflow
**Why**: Route invoices to right people for approval
**Impact**: Compliance, fraud prevention, audit trail
```tsx
<ApprovalChain>
  1. Ops Manager (£0-£5,000) - Auto-approve
  2. Director (£5,000-£20,000) - Requires approval
  3. Board (£20,000+) - Requires 2 approvals
</ApprovalChain>
```

### 8. Mobile App for Quick Approvals
**Why**: Approve invoices on the go, from job sites
**Impact**: Faster payment cycle, less admin delay
```tsx
<MobileApprovalNotification>
  📱 New invoice awaiting approval
  ABC Motors - £1,234.56
  [Approve] [Reject] [View Details]
</MobileApprovalNotification>
```

### 9. Integration with Accounting Software
**Why**: Sync to Xero, QuickBooks, Sage automatically
**Impact**: Eliminate double-entry, reduce errors
```typescript
await syncToXero(approvedInvoices);
// Creates bills, assigns to suppliers, updates accounts
```

### 10. Smart Duplicate Detection V2
**Why**: Current version good, but could be smarter
**Impact**: Catch even subtle duplicates
```typescript
// Enhanced duplicate detection:
- Same amount, different invoice number (typo?)
- Same supplier, same date, similar amount (duplicate?)
- Fuzzy match on description (90% similar?)
```

---

## Recommended Implementation Order

### Phase 1 (This Week)
1. **AI Training Interface** - Core correction UI with confidence scores
2. **Record Corrections** - Save to invoice_corrections table
3. **Basic Analytics** - Show correction count, accuracy %

### Phase 2 (Next Week)
4. **Training Dashboard** - Full analytics page
5. **Supplier-Specific Learning** - Track accuracy per supplier
6. **Export Training Data** - JSON export for AI fine-tuning

### Phase 3 (Future)
7. **Invoice-Job Linking** - Connect to job system
8. **Payment Scheduling** - Automated reminders
9. **Approval Workflow** - Multi-level approvals
10. **Accounting Integration** - Xero/QuickBooks sync

---

## Conclusion

The AI Training System will transform SmartInvoice from a basic extraction tool into an intelligent, self-improving system that gets better with every correction.

**Key Benefits**:
- 📈 Measurable accuracy improvements over time
- ⏱️ Dramatic reduction in manual data entry
- 🎯 Supplier-specific learning for common invoices
- 📊 Clear visibility into AI performance
- 🔄 Continuous feedback loop

**Next Steps**:
1. Implement Phase 1 core features (correction UI + saving)
2. Gather 100+ corrections as training data
3. Build analytics dashboard to visualize improvements
4. Export data for potential AI model fine-tuning

**Estimated ROI**:
- Development time: 2-3 weeks (3 phases)
- Time saved per invoice: 30 sec → 5 sec (after 3 months)
- Monthly invoices: ~500
- **Monthly time savings: 208 hours → 42 hours = 166 hours saved**
- At £30/hour = **£4,980/month value** 🎯

---

**Ready to implement?** Let's start with Phase 1 - the core correction interface and confidence scoring system! 🚀
