# SmartInvoice Visual Document Markup Tool - Design Specification

## Overview

**Purpose:** Allow users to visually annotate sample documents (invoices, PODs, quotes) by drawing bounding boxes around fields to train the AI on where to extract data.

**User Request:**
> "The AI training piece should have the option to mark up a sample document to highlight fields to use as doc name and info on the POD"

---

## Features

### 1. Document Upload & Display

**Supported Formats:**
- PDF files (most common for invoices/PODs)
- Images (JPG, PNG) for scanned documents
- Multi-page PDF support

**Display:**
- Render document at appropriate zoom level
- Navigation for multi-page documents
- Zoom in/out controls
- Pan/scroll for large documents

### 2. Bounding Box Drawing

**Drawing Mode:**
- Click and drag to create rectangular bounding box
- Visual feedback while drawing (dotted line preview)
- Release to complete box
- Auto-snap to text boundaries (optional AI assist)

**Box Management:**
- Resize: Drag corners/edges
- Move: Click and drag box
- Delete: Select box + Delete key or trash icon
- Duplicate: Copy box to quickly mark similar fields

**Visual Design:**
```
┌─────────────────────────────────────────────┐
│ Sample Invoice - ABC Motors Ltd             │
│                                             │
│ ╔══════════════╗  ← Bounding box (blue)    │
│ ║ INV-12345    ║                            │
│ ╚══════════════╝                            │
│ [Invoice Number] [Confidence: Always]      │
│                                             │
│ ╔═══════════════╗                           │
│ ║ £1,234.56     ║                           │
│ ╚═══════════════╝                           │
│ [Gross Amount] [Confidence: Usually]       │
└─────────────────────────────────────────────┘
```

### 3. Field Labeling

**Label Types:**

**For Invoices:**
- Invoice Number
- Invoice Date
- Due Date
- Supplier Name
- Supplier Address
- Net Amount
- VAT Amount
- Gross Amount
- Payment Terms
- Description
- Line Items (table detection)
- PO Number
- Job Reference

**For PODs (Proof of Delivery):**
- Delivery Date
- Delivery Time
- Recipient Name
- Delivery Address
- Signature Box
- Driver Name
- Vehicle Registration
- Notes/Comments
- Photo Evidence Indicator
- Condition on Delivery
- Number of Items

**For Quotes:**
- Quote Number
- Quote Date
- Valid Until Date
- Customer Name
- Quote Total
- Line Items
- Terms & Conditions

**Labeling UI:**
- Dropdown menu when box is created
- Search to filter field types
- Recently used fields at top
- Custom field option

### 4. Confidence/Priority Levels

**For each field, user can set:**

- **Always** (100%): Field always in this location
- **Usually** (80%): Field usually here, but may vary
- **Sometimes** (50%): Field occasionally here
- **Fallback** (20%): Check here if not found elsewhere

**Use Case:**
```
Invoice Number:
  - Box 1: Top right corner [Always]
  - Box 2: Header center [Fallback]

Gross Amount:
  - Box 1: Bottom right [Usually]
  - Box 2: Summary table [Always]
```

### 5. Template Management

**Template Properties:**
```typescript
interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  document_type: 'invoice' | 'pod' | 'quote' | 'receipt' | 'custom';
  supplier_id?: string;  // Supplier-specific template
  is_generic: boolean;   // Generic vs specific template
  created_by: string;
  created_at: string;
  updated_at: string;
  version: number;
  page_count: number;
  sample_file_path?: string;  // Reference document
}

interface TemplateField {
  id: string;
  template_id: string;
  field_name: string;
  field_label: string;  // Display name
  page_number: number;  // For multi-page docs
  x: number;            // Bounding box coordinates
  y: number;
  width: number;
  height: number;
  confidence_level: 'always' | 'usually' | 'sometimes' | 'fallback';
  priority: number;     // Order of extraction
  validation_regex?: string;  // Expected format
  notes?: string;
}
```

**Template Operations:**
- **Create:** Upload sample doc → Mark fields → Save template
- **Edit:** Load template → Modify boxes → Save version
- **Delete:** Archive template (don't hard delete)
- **Duplicate:** Copy template as starting point
- **Version Control:** Track template changes over time

**Template Library:**
```
┌───────────────────────────────────────────────────┐
│ Document Templates                                │
├───────────────────────────────────────────────────┤
│                                                   │
│ ✅ ABC Motors - Invoice Template (v3)            │
│    12 fields marked | 95% accuracy              │
│    Last used: 2 hours ago                        │
│    [Edit] [Duplicate] [Test] [Archive]          │
│                                                   │
│ ✅ Generic UK Invoice Template (v1)              │
│    10 fields marked | 78% accuracy              │
│    Last used: 1 day ago                          │
│    [Edit] [Duplicate] [Test] [Archive]          │
│                                                   │
│ ✅ Standard POD Template (v2)                    │
│    8 fields marked | 88% accuracy               │
│    Last used: 3 hours ago                        │
│    [Edit] [Duplicate] [Test] [Archive]          │
│                                                   │
│ [+ Create New Template]                          │
└───────────────────────────────────────────────────┘
```

### 6. Testing & Validation

**Test Template:**
- Upload new document (same supplier/type)
- Apply template
- Show extraction results
- Highlight matched vs unmatched fields
- Compare AI confidence with vs without template

**Validation Display:**
```
┌───────────────────────────────────────────────────┐
│ Template Test Results                             │
│                                                   │
│ Document: invoice_abc_motors_2024_02.pdf         │
│ Template: ABC Motors Invoice v3                  │
│                                                   │
│ ✅ Invoice Number  - Matched (98% confidence)    │
│ ✅ Date            - Matched (95% confidence)    │
│ ✅ Supplier        - Matched (99% confidence)    │
│ ⚠️  Net Amount     - Matched (72% confidence)    │
│ ❌ VAT Amount      - Not found                   │
│                                                   │
│ Overall Match Rate: 80% (4/5 fields)             │
│                                                   │
│ [Adjust Template] [Accept] [Try Different]       │
└───────────────────────────────────────────────────┘
```

### 7. AI Integration

**How Templates Improve Extraction:**

1. **Region-Focused Extraction**
   - AI looks in marked regions first
   - Higher confidence for template-matched fields
   - Faster extraction (don't scan entire doc)

2. **Validation**
   - If extracted value doesn't match template region, flag for review
   - Compare template location vs actual location
   - Learn when supplier changes format

3. **Fallback Strategy**
```
Step 1: Try template extraction (if supplier template exists)
Step 2: If confidence < 70%, try generic template
Step 3: If still low, fall back to full-page AI extraction
Step 4: Flag for manual review if confidence < 50%
```

4. **Continuous Learning**
   - Track template match rate over time
   - Auto-suggest template updates if format changes
   - Notify user: "ABC Motors invoice format may have changed"

---

## Technical Implementation

### Frontend Components

#### 1. Document Viewer Component

**Library Options:**
- **react-pdf** - Render PDFs in browser
- **pdf.js** - Mozilla's PDF renderer
- **pdfjs-dist** - Lightweight alternative

**Features:**
- Page navigation
- Zoom controls (25%, 50%, 75%, 100%, 150%, 200%)
- Fit to width/height
- Rotation (for scanned docs)
- Download original

#### 2. Canvas Overlay Component

**Library Options:**
- **Konva.js** - High-performance canvas library
- **Fabric.js** - Object-based canvas manipulation
- **React-konva** - React wrapper for Konva

**Implementation:**
```tsx
import { Stage, Layer, Rect, Text } from 'react-konva';

function MarkupCanvas({ documentImage, onBoxesChange }) {
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);

  const handleMouseDown = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    setIsDrawing(true);
    setCurrentBox({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      label: '',
    });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentBox) return;

    const pos = e.target.getStage().getPointerPosition();
    setCurrentBox({
      ...currentBox,
      width: pos.x - currentBox.x,
      height: pos.y - currentBox.y,
    });
  };

  const handleMouseUp = () => {
    if (currentBox && currentBox.width > 5 && currentBox.height > 5) {
      setBoxes([...boxes, currentBox]);
      onBoxesChange([...boxes, currentBox]);
    }
    setIsDrawing(false);
    setCurrentBox(null);
  };

  return (
    <Stage
      width={documentWidth}
      height={documentHeight}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Layer>
        {/* Background document image */}
        <Image image={documentImage} />

        {/* Existing bounding boxes */}
        {boxes.map((box, i) => (
          <Rect
            key={i}
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            stroke={box.label ? '#3b82f6' : '#9ca3af'}
            strokeWidth={2}
            dash={box.label ? [] : [5, 5]}
            draggable
            onDragEnd={(e) => updateBoxPosition(i, e.target.position())}
          />
        ))}

        {/* Current drawing box */}
        {currentBox && (
          <Rect
            x={currentBox.x}
            y={currentBox.y}
            width={currentBox.width}
            height={currentBox.height}
            stroke="#3b82f6"
            strokeWidth={2}
            dash={[5, 5]}
          />
        )}
      </Layer>
    </Stage>
  );
}
```

#### 3. Field Label Panel

**UI Design:**
```tsx
function FieldLabelPanel({ selectedBox, onLabelChange }) {
  return (
    <div className="field-label-panel">
      <h3>Field Properties</h3>

      <label>Field Type</label>
      <select value={selectedBox.label} onChange={onLabelChange}>
        <optgroup label="Invoice Fields">
          <option value="invoice_number">Invoice Number</option>
          <option value="invoice_date">Invoice Date</option>
          <option value="supplier_name">Supplier Name</option>
          <option value="net_amount">Net Amount</option>
          <option value="vat_amount">VAT Amount</option>
          <option value="gross_amount">Gross Amount</option>
        </optgroup>
        <optgroup label="POD Fields">
          <option value="delivery_date">Delivery Date</option>
          <option value="recipient_name">Recipient Name</option>
          <option value="signature">Signature Box</option>
        </optgroup>
        <option value="custom">Custom Field...</option>
      </select>

      <label>Confidence Level</label>
      <select value={selectedBox.confidence}>
        <option value="always">Always (100%)</option>
        <option value="usually">Usually (80%)</option>
        <option value="sometimes">Sometimes (50%)</option>
        <option value="fallback">Fallback (20%)</option>
      </select>

      <label>Validation (Optional)</label>
      <input
        type="text"
        placeholder="Regex pattern (e.g., INV-\d{5})"
        value={selectedBox.validation}
      />

      <label>Notes</label>
      <textarea placeholder="Additional context..."></textarea>

      <button onClick={deleteBox}>Delete Box</button>
    </div>
  );
}
```

#### 4. Template Management UI

**Page Structure:**
```tsx
function TemplateManagement() {
  return (
    <Layout>
      <h1>Document Templates</h1>

      {/* Template List */}
      <TemplateList templates={templates} onSelect={loadTemplate} />

      {/* Create New Button */}
      <button onClick={startNewTemplate}>+ Create New Template</button>

      {/* Template Editor (when editing) */}
      {activeTemplate && (
        <TemplateEditor
          template={activeTemplate}
          onSave={saveTemplate}
          onTest={testTemplate}
        />
      )}
    </Layout>
  );
}

function TemplateEditor({ template, onSave, onTest }) {
  return (
    <div className="template-editor">
      {/* Left: Document viewer with markup canvas */}
      <div className="document-viewer">
        <DocumentViewer src={template.sample_file_path} />
        <MarkupCanvas boxes={template.fields} onUpdate={updateFields} />
      </div>

      {/* Right: Field list and properties */}
      <div className="field-properties">
        <h3>Template Fields ({template.fields.length})</h3>
        <FieldList fields={template.fields} onSelect={selectField} />
        <FieldLabelPanel selectedBox={selectedField} />
      </div>

      {/* Bottom: Actions */}
      <div className="actions">
        <button onClick={onSave}>Save Template</button>
        <button onClick={onTest}>Test Template</button>
        <button onClick={cancel}>Cancel</button>
      </div>
    </div>
  );
}
```

### Backend API Routes

#### Create Template
```typescript
// POST /api/templates/create
interface CreateTemplateRequest {
  name: string;
  description?: string;
  document_type: string;
  supplier_id?: string;
  sample_file: File;
}

interface CreateTemplateResponse {
  template_id: string;
  sample_file_path: string;
}
```

#### Save Template Fields
```typescript
// POST /api/templates/:id/fields
interface SaveFieldsRequest {
  fields: TemplateField[];
}
```

#### Test Template
```typescript
// POST /api/templates/:id/test
interface TestTemplateRequest {
  template_id: string;
  test_document: File;
}

interface TestTemplateResponse {
  extraction_results: {
    field_name: string;
    value: string;
    confidence: number;
    matched: boolean;
    location: { x: number; y: number; width: number; height: number };
  }[];
  overall_match_rate: number;
  recommendations: string[];
}
```

#### Apply Template to Invoice
```typescript
// POST /api/invoices/extract-with-template
interface ExtractWithTemplateRequest {
  invoice_file: File;
  template_id?: string;  // Optional: auto-detect if not provided
  supplier_id?: string;
}

interface ExtractWithTemplateResponse {
  extracted_data: ExtractedInvoiceData;
  template_used?: string;
  template_match_rate?: number;
  confidence_boost: number;  // How much template improved confidence
}
```

### Database Schema

```sql
-- Document Templates
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'pod', 'quote', 'receipt', 'custom')),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  is_generic BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  page_count INTEGER DEFAULT 1,
  sample_file_path TEXT,
  match_rate DECIMAL(5, 2),  -- Average template match rate
  usage_count INTEGER DEFAULT 0
);

-- Template Fields (Bounding Boxes)
CREATE TABLE template_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  page_number INTEGER DEFAULT 1,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  confidence_level TEXT CHECK (confidence_level IN ('always', 'usually', 'sometimes', 'fallback')),
  priority INTEGER DEFAULT 0,
  validation_regex TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Template Usage Tracking
CREATE TABLE template_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  match_rate DECIMAL(5, 2),
  fields_matched INTEGER,
  fields_total INTEGER,
  avg_confidence DECIMAL(5, 2)
);

-- Indexes
CREATE INDEX idx_templates_supplier ON document_templates(supplier_id);
CREATE INDEX idx_templates_type ON document_templates(document_type);
CREATE INDEX idx_template_fields_template ON template_fields(template_id);
CREATE INDEX idx_template_usage_template ON template_usage(template_id);
```

---

## User Flow

### Creating a Template

**Step 1: Upload Sample Document**
```
User clicks "Create New Template"
→ Upload dialog opens
→ User selects sample invoice/POD
→ Document renders on screen
```

**Step 2: Mark Fields**
```
User activates "Draw Mode"
→ Click and drag to create bounding box around "Invoice Number"
→ Release mouse
→ Dropdown appears: "Label this field"
→ User selects "Invoice Number"
→ Repeat for all fields
```

**Step 3: Configure Template**
```
User sets template properties:
- Name: "ABC Motors Invoice Template"
- Type: Invoice
- Supplier: ABC Motors Ltd
- Description: "Standard format used since 2024"
```

**Step 4: Save & Test**
```
User clicks "Save Template"
→ Template saved to database
→ User clicks "Test Template"
→ Uploads different ABC Motors invoice
→ System applies template and shows results
→ User verifies accuracy
```

**Step 5: Use Template**
```
When user uploads new ABC Motors invoice:
→ System auto-detects supplier
→ Applies "ABC Motors Invoice Template"
→ Extraction uses template regions first
→ Higher confidence scores
→ Faster processing
```

### Using a Template

**Automatic Application:**
```
1. User uploads invoice
2. System detects supplier (from file name or quick scan)
3. System finds matching template for supplier
4. Applies template-guided extraction
5. Shows confidence boost: "Using ABC Motors template (+15% confidence)"
```

**Manual Application:**
```
1. User uploads document
2. User selects "Apply Template" from dropdown
3. User chooses template from library
4. System extracts using template
5. User reviews and confirms
```

---

## POD-Specific Features

### Proof of Delivery Template

**Standard POD Fields:**

```
┌──────────────────────────────────────────────────┐
│ PROOF OF DELIVERY                                │
├──────────────────────────────────────────────────┤
│                                                  │
│ Delivery Date: [Box 1]  Time: [Box 2]          │
│                                                  │
│ Delivered To:                                    │
│ Name: [Box 3]                                    │
│ Address: [Box 4 - Multi-line]                   │
│                                                  │
│ Items Delivered: [Box 5]                        │
│ Condition: [Box 6]                              │
│                                                  │
│ Signature: [Box 7 - Image recognition]         │
│                                                  │
│ Driver: [Box 8]  Vehicle: [Box 9]              │
│                                                  │
│ Notes: [Box 10 - Multi-line text]              │
│                                                  │
│ Photo Evidence: [Box 11 - Image indicator]     │
└──────────────────────────────────────────────────┘
```

**Special POD Features:**

1. **Signature Detection**
   - Mark signature box region
   - AI checks for presence of signature
   - Flag if signature missing

2. **Photo Evidence Linking**
   - Mark region where photo reference appears
   - Extract photo ID or embedded image
   - Link to separate photo file if external

3. **Multi-line Text Fields**
   - Support for address blocks
   - Notes/comments sections
   - Delivery instructions

4. **Checkbox Recognition**
   - "Delivery complete" checkbox
   - "Damaged items" checkbox
   - Condition checkboxes (Good/Fair/Poor)

---

## Success Metrics

### Template Accuracy
- **Target:** 90%+ field match rate for templated suppliers
- **Measure:** Compare template extraction vs general AI extraction
- **Benefit:** Faster processing, higher confidence, fewer corrections

### Time Savings
- **Target:** 50% reduction in correction time for templated suppliers
- **Measure:** Time to review invoice with vs without template
- **Benefit:** Invoice processing goes from 60sec → 30sec per invoice

### Template Coverage
- **Target:** Templates for top 20 suppliers within 1 month
- **Measure:** % of invoices processed with templates
- **Benefit:** 80% of invoices use templates → 80% accuracy boost

### POD Processing
- **Target:** 95% accuracy on POD field extraction
- **Measure:** POD fields correctly extracted without correction
- **Benefit:** Automated POD logging, integrated with job tracking

---

## Future Enhancements

### Phase 1 (Current)
- Basic bounding box drawing
- Field labeling
- Template storage
- Template application

### Phase 2 (Next Month)
- **Table Detection:** Auto-detect line item tables
- **Smart Snap:** AI-assisted box positioning
- **Auto-labeling:** AI suggests field labels based on content
- **Template Versioning:** Track changes, rollback if needed

### Phase 3 (Future)
- **Multi-page Support:** Templates for multi-page documents
- **Conditional Fields:** "If field X exists, check field Y"
- **Calculated Fields:** "VAT = Net * 0.2" validation
- **Template Marketplace:** Share templates with other users
- **OCR Improvement Training:** Use markup to improve OCR accuracy

---

## Technical Considerations

### Performance
- Render PDF on server, send image to client (lighter)
- Cache rendered pages for faster navigation
- Lazy load multi-page documents
- Compress bounding box coordinates

### Browser Compatibility
- Canvas drawing works in all modern browsers
- PDF.js fallback for older browsers
- Touch support for tablets
- Responsive design for mobile review

### Security
- Templates stored per organization (RLS)
- Supplier templates only visible to authorized users
- Sample documents stored securely
- Redact sensitive data in samples if needed

### Scalability
- Index templates by supplier_id and document_type
- Cache frequently used templates
- Batch template application for multiple invoices
- Background job for template testing

---

## Implementation Estimate

### Phase 1: MVP (1-2 weeks)
- ✅ PDF viewer with zoom/pan
- ✅ Bounding box drawing (konva)
- ✅ Field labeling dropdown
- ✅ Save template to database
- ✅ Apply template to new document
- ✅ Basic POD support

### Phase 2: Full Features (2-3 weeks)
- ✅ Template library UI
- ✅ Template testing interface
- ✅ Edit/delete/duplicate templates
- ✅ Confidence level settings
- ✅ Validation regex
- ✅ Multi-page support

### Phase 3: Advanced (3-4 weeks)
- ✅ Table detection for line items
- ✅ Smart snap to text
- ✅ Auto-labeling suggestions
- ✅ Template versioning
- ✅ Usage analytics

**Total Estimate:** 6-9 weeks for complete feature

---

## Next Steps

1. **Choose canvas library** (Konva.js recommended)
2. **Set up PDF viewer** (react-pdf)
3. **Create database schema** (document_templates, template_fields)
4. **Build basic drawing interface**
5. **Implement template storage**
6. **Test with sample invoice**
7. **Integrate with AI extraction**
8. **Build POD-specific features**

---

**Status:** Design Complete | Ready for Implementation

**Priority:** HIGH (User-requested feature)

**Impact:** VERY HIGH (Game-changer for AI accuracy)
