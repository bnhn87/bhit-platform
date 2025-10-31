# 🚀 SmartQuote v2.0 - World-Class Quote Management

## Overview

SmartQuote v2.0 is a next-generation quote management system built with world-class engineering standards. It represents a complete evolution of the original SmartQuote with significant improvements in reliability, intelligence, and workflow automation.

## ✨ Key Features

### 🎯 Enhanced Document Parsing
- **Multi-pass parsing** with intelligent retry logic
- **Confidence scoring** for every extracted product (0-100%)
- **Adaptive AI prompts** that improve with each attempt
- **Visual confidence indicators** to highlight items needing review
- **Automatic validation** with sanity checks

### 🧠 Product Learning System
- **Pattern detection**: Learns which products are commonly used together
- **Smart suggestions**: AI-powered product recommendations based on history
- **Time learning**: Records and learns from installation time adjustments
- **Confidence scoring**: Uses sample size and consistency to determine reliability

### 📝 Automatic Revision Tracking
- **Automatic versioning**: "Rev 1", "Rev 2", "Rev 3" automatically appended
- **Complete snapshots**: Full history of every change
- **Audit trail**: Who changed what and when
- **Diff comparison**: Compare any two revisions side-by-side

### 📧 Email Automation
- **Inbox monitoring**: Automatically detects new quote requests
- **AI preparation**: Parses emails and creates draft quotes
- **Human-in-the-loop**: All quotes reviewed before sending
- **Attention flags**: Highlights items needing special review

### 📊 Analytics & Insights
- **Parse accuracy tracking**: Monitor AI performance over time
- **Conversion metrics**: Track quote-to-job conversion rates
- **Time efficiency**: Measure processing speed improvements
- **Product patterns**: Identify most popular products and combinations

## 🏗️ Installation

### Step 1: Database Migration

Apply the database schema by running the SQL in Supabase:

```bash
# Open Supabase Dashboard
# Navigate to: SQL Editor
# Copy and paste the contents of:
modules/smartquote-v2/database/001_smartquote_v2_schema.sql
# Click "Run"
```

**Or use the Supabase CLI:**

```bash
cd /Users/benjaminhone_1/Desktop/BHIT\ WORK\ OS/apps/web
supabase db push modules/smartquote-v2/database/001_smartquote_v2_schema.sql
```

### Step 2: Verify Environment Variables

Ensure these are in your `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
```

### Step 3: Start Development Server

```bash
cd /Users/benjaminhone_1/Desktop/BHIT\ WORK\ OS/apps/web
npm run dev
```

### Step 4: Access SmartQuote v2

Open your browser to:
```
http://localhost:3000/smartquote-v2
```

## 🎯 Usage Guide

### Creating a New Quote

1. **Upload Documents**: Drag & drop PDFs, Excel files, or images
2. **Or Paste Text**: Copy/paste quote details directly
3. **Click "Parse Quote"**: AI extracts all information
4. **Review Results**: Check confidence scores and adjust as needed
5. **Finalize**: Complete the quote and generate outputs

### Understanding Confidence Scores

- **90-100%** (Green): Excellent - High confidence, ready to use
- **70-89%** (Blue): Good - Minor review recommended  
- **50-69%** (Yellow): Fair - Verify before proceeding
- **Below 50%** (Red): Low - Manual input or correction needed

### Using Product Suggestions

When you add products, v2 analyzes patterns and suggests:
- Products frequently used together
- Items commonly ordered in similar quantities
- Alternatives based on historical data

### Creating Revisions

1. Click "Create New Revision" in any quote
2. Describe the changes made
3. System automatically:
   - Creates full snapshot
   - Updates reference (e.g., "BHIT-2025-001 Rev 2")
   - Logs the change in audit trail

## 🔄 v1 vs v2 Comparison

### What's Better in v2?

| Feature | v1 | v2 |
|---------|----|----|
| **Parsing Accuracy** | Single pass | Multi-pass with retry |
| **Confidence Scoring** | None | Per-product + overall |
| **Product Learning** | None | Full pattern detection |
| **Revision Tracking** | Manual | Automatic |
| **Email Automation** | None | AI-powered drafts |
| **Analytics** | Basic | Comprehensive |
| **Error Recovery** | Limited | Intelligent retry |

### Running Both Versions

You can run both versions simultaneously:

- **v1.0**: `http://localhost:3000/smart-quote`
- **v2.0**: `http://localhost:3000/smartquote-v2`

Perfect for A/B testing and gradual migration!

## 🗂️ Project Structure

```
smartquote-v2/
├── App.tsx                 # Main application component
├── components/             # UI components
│   ├── InitialInput.tsx   # File upload & text input
│   ├── ParseReviewPanel.tsx  # Review parsed products
│   ├── ProductSuggestionsPanel.tsx  # AI suggestions
│   ├── QuoteDetailsForm.tsx  # Quote info form
│   ├── ResultsDisplay.tsx    # Final quote display
│   ├── RevisionHistory.tsx   # Version history
│   ├── EmailDraftsPanel.tsx  # Email queue
│   └── AnalyticsDashboard.tsx  # Metrics & insights
├── services/               # Business logic
│   ├── enhancedGeminiService.ts  # AI parsing
│   ├── productLearningService.ts # Pattern detection
│   ├── revisionTrackingService.ts # Version control
│   ├── emailAutomationService.ts # Email processing
│   ├── imageExtractionService.ts # PDF images
│   └── analyticsService.ts      # Metrics tracking
├── database/              # SQL migrations
│   └── 001_smartquote_v2_schema.sql
└── types/                 # TypeScript definitions
    └── index.ts
```

## 🐛 Troubleshooting

### Parse Confidence Too Low

If confidence scores are consistently low:

1. **Check document quality**: Ensure PDFs are text-based, not scanned images
2. **Review product codes**: Verify they follow expected formats
3. **Adjust temperature**: Edit `enhancedGeminiService.ts` line 225
4. **Add training data**: Use more quotes to improve learning

### Database Connection Issues

```bash
# Test connection
cd apps/web
node -e "require('./lib/supabaseClient').supabase.from('smartquote_v2_quotes').select('count').single().then(console.log)"
```

### Products Not Appearing

Check exclusion rules in `enhancedGeminiService.ts`:
- "access door" items are excluded
- "insert" without "pedestal" is excluded
- "delivery & installation" is excluded

## 📈 Future Enhancements

- [ ] Real-time email monitoring webhook
- [ ] Advanced analytics dashboards
- [ ] Mobile app integration
- [ ] Bulk quote processing
- [ ] Custom AI training per company
- [ ] Integration with accounting systems

## 🤝 Support

For issues or questions:
1. Check this README
2. Review the code comments
3. Check the audit logs in Supabase
4. Contact the development team

---

**Built with world-class engineering** 🌟  
Version 2.0 | October 2025
