# SmartQuote User Guide

## 🎯 Overview

SmartQuote is an AI-powered quote management system for furniture installation projects. It uses Google Gemini AI to parse quote documents and automatically calculates labour, crew requirements, waste, and pricing.

**Two Versions Available:**
- **SmartQuote v1.0** (`/smartquote`) - Production-ready, battle-tested quote management
- **SmartQuote v2.0** (`/smartquote-v2`) - Next-generation with enhanced AI parsing and product learning

---

## 🚀 Quick Start

### V1.0 Quick Start

1. Navigate to `/smartquote` in your BHIT Work OS
2. Choose one of the following options:
   - **Upload Document**: Drag & drop a PDF, Excel, or Word file
   - **Paste Text**: Copy and paste quote details directly
   - **Manual Entry**: Build a quote from scratch
3. Review AI-parsed products
4. Enter quote details (client, project, address)
5. Calculate and review results
6. Export as PDF or Excel

### V2.0 Quick Start

1. Navigate to `/smartquote-v2` in your BHIT Work OS
2. Upload documents or paste quote text
3. Review parsed products with **confidence scores**
4. Verify and adjust details
5. Finalize quote with enhanced analytics
6. Track revisions and product learning over time

---

## 📋 Features

### Core Features (V1.0 & V2.0)

#### 🤖 AI-Powered Parsing
- **Google Gemini Integration**: Extracts products, quantities, and details from documents
- **Multi-Format Support**: PDF, Excel (.xlsx, .xls), Word (.docx), and images
- **Intelligent Retry**: Automatic retry with adaptive prompts if initial parse fails
- **Confidence Scoring** (v2.0): See how confident the AI is about each product

#### 📊 Smart Calculations
- **Labour Hours**: Calculates installation time based on product catalogue
- **Crew Optimization**: Determines optimal crew size and composition
- **Waste Volume**: Realistic waste calculations per product type
- **Pricing**: Complete cost breakdown including vans, labour, and parking

#### 🏗️ Crew Management
- **Automatic Crew Sizing**: Optimal fitter and supervisor allocation
- **Van Requirements**: Determines if 1-man or 2-man van needed
- **Heavy Item Detection**: Flags products requiring additional crew
- **Manual Overrides**: Adjust crew size and van type as needed

#### 📍 Address & Logistics
- **Multi-Address Detection**: Site, collection, and warehouse addresses
- **UK Postcode Validation**: Ensures addresses are correctly formatted
- **Route Planning**: Multi-stop logistics (Base → Collection → Site → Base)
- **ULEZ/Congestion Charges**: Automatic detection for London areas

#### 💷 Pricing & Cost Control
- **Transparent Pricing**: Clear breakdown of all costs
- **Out-of-Hours Rates**: Weekday evening, Saturday, and Sunday/Bank Holiday rates
- **Parking Charges**: Configurable daily parking costs
- **Transport Costs**: Multiple vehicle types supported
- **Specialist Reworking**: Optional specialist labour costs

#### 📄 Export & Integration
- **PDF Export**: Professional quote documents
- **Excel Export**: Detailed spreadsheets with all calculations
- **Job Creation**: Convert quotes to jobs in the Work OS
- **Quote History**: Save and retrieve previous quotes

### Enhanced Features (V2.0 Only)

#### 🧠 Product Learning
- **Pattern Recognition**: Learns which products commonly appear together
- **Time Adjustments**: Learns from historical time data
- **Smart Suggestions**: Recommends products based on patterns

#### 📝 Revision Tracking
- **Automatic Versioning**: Every change creates a new revision
- **Full Audit Trail**: See who changed what and when
- **Snapshot History**: Compare revisions side-by-side
- **Rollback Support**: Restore previous versions

#### 📧 Email Automation
- **Inbox Monitoring**: Watches for new quote requests
- **Auto-Parsing**: Extracts quote data from emails
- **Draft Generation**: Creates draft quotes automatically
- **Human Review**: Flags items requiring attention

#### 🖼️ Image Extraction
- **PDF Image Extraction**: Pulls images from PDF documents
- **Visual Verification**: Review product images alongside data
- **Reference Library**: Store images for future reference

#### 📊 Advanced Analytics
- **Parse Accuracy**: Track AI parsing success rates
- **Conversion Metrics**: Quote-to-job conversion tracking
- **Product Usage**: Most common products and quantities
- **Time Analysis**: Average quote creation times

---

## 🎓 Step-by-Step Guides

### Creating a Quote from a PDF

1. **Upload Document**
   - Click "Parse Quote from Document"
   - Drag and drop your PDF or click to browse
   - Supported formats: PDF, Excel, Word, images

2. **AI Processing**
   - Wait for Gemini AI to analyze the document (usually 10-30 seconds)
   - The AI extracts products, quantities, client info, and addresses

3. **Review Parsed Products**
   - Check the products table for accuracy
   - Green confidence scores (v2.0) indicate high accuracy
   - Yellow/red scores may need manual verification

4. **Handle Unknown Products** (if prompted)
   - Enter installation time (hours per unit)
   - Mark if the product is heavy (requires 2-man van)
   - Add waste volume if known
   - Click "Save to Catalogue" to remember for future quotes

5. **Enter Quote Details**
   - **Client**: Customer or company name
   - **Project**: Project reference or name
   - **Quote Ref**: Your quote reference number
   - **Address**: Select or enter site address
   - **Special Options**:
     - ✅ Uplift via stairs (adds buffer time)
     - ✅ Extended uplift (adds extra days and crew)
     - ✅ Specialist reworking (adds specialist cost)
     - ✅ Manual supervisor (forces supervisor allocation)
     - ✅ Out-of-hours working (applies rate multipliers)

6. **Calculate Quote**
   - Click "Calculate Quote & Proceed"
   - Review all calculated metrics:
     - Labour hours and buffered hours
     - Crew size and composition
     - Waste volume
     - Total cost breakdown

7. **Adjust if Needed**
   - Edit product quantities or times
   - Override crew size or van type
   - Add parking charges
   - Select transport vehicles

8. **Save & Export**
   - Click "Save Quote" (Ctrl+S) to store in database
   - "Export PDF" for client-facing document
   - "Export Excel" for detailed calculations
   - "Create Job" to convert to a Work OS job

### Manual Quote Entry

1. **Start Manual Mode**
   - Click "Manual Entry" from the home screen

2. **Add Products**
   - Type product code or description
   - Select from catalogue suggestions
   - Enter quantity
   - Click "Add Product"
   - Repeat for all products

3. **Enter Details**
   - Fill in client, project, and address info
   - Add any special requirements

4. **Calculate & Export**
   - Follow steps 6-8 from PDF guide above

### Using Quote History

1. **View Saved Quotes**
   - Click "Quote History" from home
   - Browse all saved quotes with search/filter

2. **Load a Quote**
   - Click on any quote to view details
   - Edit and recalculate if needed
   - Save as new quote or update existing

3. **Compare Quotes**
   - Click "Compare Quotes"
   - Select multiple quotes to compare side-by-side
   - Useful for client presentations

---

## ⚙️ Configuration & Admin

### Admin Panel Access

Click "Admin Panel" from the home screen to access configuration settings.

### Key Settings

#### Pricing Configuration
- **Van Rates**: Cost per day for 1-man and 2-man vans
- **Labour Rates**: Fitter, supervisor, and specialist rates
- **Default Parking**: Daily parking charge (default £75)
- **Out-of-Hours Multipliers**:
  - Weekday Evening: 1.5x
  - Saturday: 2.0x
  - Sunday/Bank Holiday: 2.25x

#### Business Rules
- **Hours per Day**: Standard working hours (default 8)
- **Supervisor Threshold**: Days before supervisor required (default 3)
- **Uplift Buffers**: Percentage buffers for stairs and extended uplift
- **Labour Buffers**: Percentage buffers based on project duration

#### Product Catalogue
- **Add Products**: Define installation times and waste volumes
- **Edit Products**: Update existing product data
- **Delete Products**: Remove obsolete products
- **Import/Export**: Bulk manage catalogue data

#### Vehicles
- **Add Vehicles**: Define vehicle types and costs
- **Capacity**: Set volume capacity in m³
- **Daily Rate**: Cost per day for each vehicle

### Keyboard Shortcuts

- **Ctrl+S**: Save current quote
- **Ctrl+Z**: Undo last product change
- **Ctrl+Y** or **Ctrl+Shift+Z**: Redo
- **?**: Show all keyboard shortcuts
- **Esc**: Close modals

---

## 🔧 Advanced Features

### Address Management

SmartQuote can handle complex logistics with multiple addresses:

1. **Site Address**: Where installation happens
2. **Collection Address**: Where to collect furniture
3. **Warehouse Address**: Your depot/base
4. **Return Address**: Where to return waste/packaging

**Auto-Detection**:
- AI extracts all addresses from documents
- Validates UK postcodes
- Calculates distances and travel times
- Detects ULEZ and congestion charge zones

### Crew Optimization

The system automatically calculates optimal crew composition:

**Factors Considered**:
- Total labour hours required
- Heavy items requiring extra crew
- Project duration
- Cost optimization
- Van capacity

**Override Options**:
- Force specific number of fitters
- Add/remove supervisor
- Change van type
- Add specialist crew

### Waste Calculations

**Default Formula**: `Total Products × 0.035 m³`

**Product-Specific Waste**:
- Desks: 0.05 m³
- Chairs: 0.02 m³
- Pedestals: 0.01 m³
- Screens: 0.03 m³
- (Configurable per product)

**Manual Override**: Enter custom waste volume in quote details

### Extended Uplift

For projects requiring packaging removal days after installation:

1. Enable "Extended Uplift" checkbox
2. Enter number of uplift days
3. Enter number of fitters for uplift (default 6)
4. Optionally add supervisor for uplift
5. System adds additional van and labour costs

---

## 🐛 Troubleshooting

### AI Parsing Issues

**Problem**: No products detected
- **Solution**: Ensure product codes are visible in the document
- **Alternative**: Try pasting text directly instead of PDF
- **Workaround**: Use Manual Entry mode

**Problem**: Low confidence scores (v2.0)
- **Solution**: Review products carefully, verify quantities
- **Action**: Adjust any incorrect detections before proceeding

**Problem**: Wrong products detected
- **Solution**: Delete incorrect products, add correct ones manually
- **Prevention**: Improve source document formatting

### Calculation Issues

**Problem**: Crew size seems too large
- **Solution**: Check for duplicate products
- **Override**: Use manual crew size override
- **Review**: Verify installation times in catalogue

**Problem**: Price seems too high/low
- **Solution**: Review pricing configuration in Admin Panel
- **Check**: Verify out-of-hours rates if enabled
- **Audit**: Check for unnecessary parking or transport costs

### Export Issues

**Problem**: PDF export not working
- **Solution**: Ensure browser allows popups
- **Alternative**: Try Excel export
- **Workaround**: Screenshot the results page

**Problem**: Job creation fails
- **Solution**: Ensure all required fields are filled
- **Check**: Verify quote is saved first
- **Contact**: Admin if error persists

### Performance Issues

**Problem**: Slow AI parsing
- **Cause**: Large documents or complex layouts
- **Solution**: Wait patiently (can take 30-60 seconds)
- **Alternative**: Extract text and paste instead

**Problem**: Browser freezing
- **Cause**: Too many products (>100)
- **Solution**: Refresh page and split into multiple quotes
- **Prevention**: Keep quotes focused and manageable

---

## 💡 Best Practices

### Document Preparation

✅ **Do**:
- Use clear, scannable PDFs
- Ensure product codes are visible
- Include quantities next to each product
- Keep formatting consistent

❌ **Don't**:
- Use heavily compressed or low-quality images
- Mix multiple quotes in one document
- Include excessive non-product content
- Use unusual fonts or formatting

### Quote Accuracy

✅ **Do**:
- Always review AI-parsed products
- Verify quantities and product codes
- Check addresses are correct
- Review final calculations before exporting

❌ **Don't**:
- Blindly trust AI parsing without review
- Skip the details entry step
- Ignore low confidence scores (v2.0)
- Export without checking totals

### Catalogue Management

✅ **Do**:
- Add new products as you encounter them
- Keep installation times realistic
- Mark heavy items correctly
- Update waste volumes accurately

❌ **Don't**:
- Leave products undefined for long
- Guess installation times wildly
- Forget to save learned products
- Duplicate product codes

### Workflow Efficiency

✅ **Do**:
- Use keyboard shortcuts
- Save quotes frequently (Ctrl+S)
- Use quote history for similar projects
- Utilize undo/redo for quick edits

❌ **Don't**:
- Re-enter common products manually
- Forget to save before exporting
- Ignore the manual entry mode for simple quotes
- Skip the admin panel configuration

---

## 🔐 Data & Privacy

### Data Storage

- **Local Storage**: Draft quotes and working memory
- **Database**: Saved quotes, product catalogue, configuration
- **Session Storage**: Temporary parsing data
- **No External Sharing**: All data stays in your system

### AI Processing

- **Google Gemini API**: Used only for parsing
- **Data Transmission**: Document content sent to Google for analysis
- **No Training**: Your data is not used to train Google's models
- **Ephemeral**: Parsing data not retained by Google

### Backup & Recovery

- **Automatic Saves**: Quotes saved to database automatically
- **Version History** (v2.0): All revisions stored
- **Export Options**: PDF and Excel for external backup
- **Database Backups**: Handled by system administrators

---

## 📞 Support & Feedback

### Getting Help

1. **User Guide**: This document
2. **Keyboard Shortcuts**: Press `?` in the app
3. **Admin Panel**: Configuration help text
4. **Support Team**: Contact your system administrator

### Reporting Issues

When reporting a problem, include:
- SmartQuote version (v1.0 or v2.0)
- What you were trying to do
- What happened vs. what you expected
- Screenshot if possible
- Any error messages

### Feature Requests

SmartQuote is actively developed. Suggestions welcome for:
- New calculation rules
- Additional export formats
- Integration with other tools
- UI/UX improvements
- Product catalogue enhancements

---

## 🎓 Tips & Tricks

### Power User Tips

1. **Bulk Product Addition**: In Manual Entry, add common product sets quickly
2. **Quote Templates**: Save typical quotes as templates in history
3. **Keyboard Navigation**: Use Tab and Enter to move through forms quickly
4. **Quick Calculate**: Press Enter in quantity fields to auto-add products
5. **Smart Defaults**: Set frequently-used values in Admin Panel

### Time-Saving Shortcuts

- **Duplicate Products**: Copy similar products and edit quantities
- **Batch Edit**: Edit multiple products at once in the table
- **Quick Save**: Ctrl+S saves immediately without confirmation
- **Undo Mistakes**: Ctrl+Z reverses accidental edits

### Accuracy Hacks

- **Cross-Reference**: Compare AI parsing against original document
- **Spot Check**: Verify total quantities make sense
- **Sanity Test**: Does the labour time seem reasonable?
- **Price Check**: Compare similar past quotes

### Client Presentation

- **PDF Export**: Professional client-facing documents
- **Hide Details**: Only show what client needs to see
- **Quote Comparison**: Show multiple options side-by-side
- **Quick Adjustments**: Make changes live during meetings

---

## 📊 Metrics & KPIs

### Quote Quality Metrics (v2.0)

- **Parse Accuracy**: Aim for >90% on first attempt
- **Confidence Scores**: Average >0.7 for good quality
- **Quote-to-Job Conversion**: Track success rates
- **Time to Quote**: Monitor efficiency improvements

### Business Metrics

- **Average Quote Value**: Track quote sizes
- **Product Mix**: See which products are most common
- **Labour Efficiency**: Hours per product type
- **Win Rate**: Quotes won vs. quotes sent

---

## 🚀 What's Next?

### SmartQuote Roadmap

**Coming Soon**:
- Mobile app support
- Real-time collaboration on quotes
- Advanced product learning AI
- Client portal for quote approval
- Integration with accounting systems

**Future Enhancements**:
- 3D visualization of furniture layouts
- Automatic scheduling integration
- Supplier integration for pricing
- Multi-language support

---

## ✨ Conclusion

SmartQuote transforms furniture installation quoting from a manual, error-prone process into a fast, accurate, AI-powered workflow. Whether you're using v1.0 for reliable production work or exploring v2.0's cutting-edge features, SmartQuote helps you:

✅ Save time on quote creation
✅ Improve accuracy and consistency
✅ Optimize crew and resource allocation
✅ Present professional quotes to clients
✅ Learn and improve over time

**Need help?** Contact your system administrator or refer to this guide.

**Have feedback?** We're always improving - your suggestions matter!

---

*Last Updated: November 2025*
*SmartQuote v1.0 & v2.0*
*BHIT Work OS Platform*
