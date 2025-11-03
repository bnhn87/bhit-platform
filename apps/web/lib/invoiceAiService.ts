// Invoice AI Processing Service
// Integrates with Gemini AI for intelligent invoice data extraction

import { GoogleGenAI, Type } from "@google/genai";

// Types for invoice data structure
export interface ExtractedInvoiceData {
  date: string | null;
  invoiceNumber: string | null;
  supplier: string | null;
  description: string | null;
  category: 'Vehicle' | 'Labour' | 'Materials' | 'Other' | null;
  vehicleReg: string | null;
  jobReference: string | null;
  netAmount: number | null;
  vatAmount: number | null;
  grossAmount: number | null;
  paymentTerms: string | null;
  dueDate: string | null;
  confidence: number;
  extractedText: string;
  rawData: Record<string, any>;
}

export interface ProcessingResult {
  success: boolean;
  data?: ExtractedInvoiceData;
  error?: string;
  processingTime: number;
}

// Initialize Gemini AI client (same as SmartQuote)
let ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!ai) {
    if (!process.env.GEMINI_API_KEY && !process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable not set. Please add it to your .env.local file.");
    }
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

// Response schema for structured extraction
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    date: {
      type: Type.STRING,
      description: "Invoice date in YYYY-MM-DD format",
      nullable: true
    },
    invoiceNumber: {
      type: Type.STRING,
      description: "Invoice number or reference",
      nullable: true
    },
    supplier: {
      type: Type.STRING,
      description: "Supplier or subcontractor name",
      nullable: true
    },
    description: {
      type: Type.STRING,
      description: "Description of services or goods provided",
      nullable: true
    },
    category: {
      type: Type.STRING,
      description: "Category: Vehicle, Labour, Materials, or Other",
      nullable: true
    },
    vehicleReg: {
      type: Type.STRING,
      description: "UK vehicle registration if mentioned (format: AB12 CDE)",
      nullable: true
    },
    jobReference: {
      type: Type.STRING,
      description: "Job reference or project code if mentioned",
      nullable: true
    },
    netAmount: {
      type: Type.NUMBER,
      description: "Net amount before VAT in GBP (numeric only)",
      nullable: true
    },
    vatAmount: {
      type: Type.NUMBER,
      description: "VAT amount in GBP (numeric only)",
      nullable: true
    },
    grossAmount: {
      type: Type.NUMBER,
      description: "Gross/total amount in GBP (numeric only)",
      nullable: true
    },
    paymentTerms: {
      type: Type.STRING,
      description: "Payment terms (e.g. '30 days', 'Due on receipt')",
      nullable: true
    },
    dueDate: {
      type: Type.STRING,
      description: "Payment due date in YYYY-MM-DD format if specified",
      nullable: true
    },
    confidence: {
      type: Type.NUMBER,
      description: "Confidence score from 0-100"
    }
  },
  required: ["confidence"]
};

// System instruction for Gemini
const systemInstruction = `You are an expert invoice data extraction system for a UK construction company.
Extract invoice data from subcontractor invoices with high accuracy.

**Invoice Details to Extract:**
- date: Invoice date (YYYY-MM-DD format)
- invoiceNumber: Invoice number or reference
- supplier: Supplier/subcontractor company name
- description: Brief description of services or goods
- category: Categorize as Vehicle, Labour, Materials, or Other
- vehicleReg: UK vehicle registration if mentioned (format: AB12 CDE or AB12CDE)
- jobReference: Job/project reference code if mentioned
- netAmount: Net amount before VAT (numeric only, no symbols)
- vatAmount: VAT amount (numeric only)
- grossAmount: Total/gross amount (numeric only)
- paymentTerms: Payment terms (e.g., "30 days")
- dueDate: Payment due date if specified (YYYY-MM-DD format)
- confidence: Your confidence in the extraction (0-100)

**UK-Specific Rules:**
- Currency is GBP (£)
- Standard VAT rate is 20%
- Dates should be converted to YYYY-MM-DD
- Vehicle registrations: AB12 CDE format
- Extract numeric values without currency symbols

**Categorization Guidelines:**
- Vehicle: Van hire, truck rental, vehicle costs, transport
- Labour: Installation, fitting, subcontractor work, services
- Materials: Supplies, equipment, parts, materials
- Other: Everything else

**If a field is not found or unclear, set it to null.**
**Return your confidence score based on clarity and completeness of data.**`;

/**
 * Process invoice file with AI using Gemini
 */
export async function processInvoiceWithAI(
  file: File | Blob
): Promise<ProcessingResult> {
  const startTime = Date.now();

  try {
    // Convert file to base64
    const base64Data = await fileToBase64(file);
    const mimeType = file.type || 'application/pdf';

    // Extract with Gemini with retry logic
    const extractedData = await extractWithGemini(base64Data, mimeType);

    return {
      success: true,
      data: validateAndEnrichData(extractedData),
      processingTime: Date.now() - startTime,
    };
  } catch (error) {
    console.error('Invoice processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime,
    };
  }
}

/**
 * Extract data using Gemini AI (with retry logic)
 */
async function extractWithGemini(
  base64Data: string,
  mimeType: string
): Promise<ExtractedInvoiceData> {
  const MAX_RETRIES = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await attemptExtraction(base64Data, mimeType, attempt);

      // If we got a reasonable extraction, return it
      if (result.confidence && result.confidence > 0) {
        return result;
      }

      // If confidence is 0, retry (unless it's the last attempt)
      if (attempt < MAX_RETRIES) {
        console.log(`Attempt ${attempt} had low confidence, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }

      return result;

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < MAX_RETRIES) {
        console.log(`Extraction attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
    }
  }

  // All attempts failed
  throw new Error(lastError?.message || "Failed to extract invoice data with AI");
}

/**
 * Single extraction attempt using Gemini
 */
async function attemptExtraction(
  base64Data: string,
  mimeType: string,
  attempt: number
): Promise<ExtractedInvoiceData> {
  const enhancedPrompt = attempt > 1
    ? "Extract invoice data from this document. Be flexible with formats and look for any invoice-like information."
    : "Extract invoice data from this document.";

  const contents = {
    parts: [
      { text: enhancedPrompt },
      {
        inlineData: {
          mimeType: mimeType,
          data: base64Data
        }
      }
    ]
  };

  const response = await getAI().models.generateContent({
    model: "gemini-2.5-flash",
    contents: contents,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
      temperature: 0.3,
      topP: 0.9,
      topK: 40,
    },
  });

  const jsonText = response.text?.trim() || '{}';
  const parsedData = JSON.parse(jsonText);

  // Create ExtractedInvoiceData with defaults
  const extractedData: ExtractedInvoiceData = {
    date: parsedData.date || null,
    invoiceNumber: parsedData.invoiceNumber || null,
    supplier: parsedData.supplier || null,
    description: parsedData.description || null,
    category: parsedData.category || null,
    vehicleReg: parsedData.vehicleReg || null,
    jobReference: parsedData.jobReference || null,
    netAmount: parsedData.netAmount || null,
    vatAmount: parsedData.vatAmount || null,
    grossAmount: parsedData.grossAmount || null,
    paymentTerms: parsedData.paymentTerms || null,
    dueDate: parsedData.dueDate || null,
    confidence: parsedData.confidence || 0,
    extractedText: jsonText,
    rawData: parsedData,
  };

  return extractedData;
}

/**
 * Validate and enrich extracted data
 */
function validateAndEnrichData(data: ExtractedInvoiceData): ExtractedInvoiceData {
  const validated = { ...data };

  // Ensure VAT calculation
  if (validated.netAmount && !validated.vatAmount) {
    validated.vatAmount = Math.round(validated.netAmount * 0.2 * 100) / 100;
  }

  // Ensure gross calculation
  if (validated.netAmount && validated.vatAmount && !validated.grossAmount) {
    validated.grossAmount = validated.netAmount + validated.vatAmount;
  }

  // Validate vehicle registration format
  if (validated.vehicleReg) {
    validated.vehicleReg = normalizeVehicleReg(validated.vehicleReg);
  }

  // Auto-categorize if not set
  if (!validated.category) {
    validated.category = categorizeFromDescription(validated.description || '');
  }

  // Calculate due date if payment terms exist but no due date
  if (validated.paymentTerms && !validated.dueDate && validated.date) {
    validated.dueDate = calculateDueDate(validated.date, validated.paymentTerms);
  }

  return validated;
}

/**
 * Categorize based on description
 */
function categorizeFromDescription(description: string): 'Vehicle' | 'Labour' | 'Materials' | 'Other' {
  const lower = description.toLowerCase();

  const vehicleKeywords = ['vehicle', 'van', 'truck', 'hire', 'rental', 'transport'];
  const labourKeywords = ['labour', 'labor', 'installation', 'fitting', 'work', 'service', 'subcontract'];
  const materialKeywords = ['material', 'supplies', 'equipment', 'tools', 'parts'];

  if (vehicleKeywords.some(keyword => lower.includes(keyword))) return 'Vehicle';
  if (labourKeywords.some(keyword => lower.includes(keyword))) return 'Labour';
  if (materialKeywords.some(keyword => lower.includes(keyword))) return 'Materials';

  return 'Other';
}

/**
 * Parse date string to YYYY-MM-DD format
 */
function parseDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }

    // Try UK format DD/MM/YYYY
    const ukMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (ukMatch) {
      const [_, day, month, year] = ukMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Normalize UK vehicle registration
 */
function normalizeVehicleReg(reg: string | null | undefined): string | null {
  if (!reg) return null;

  // Remove spaces and convert to uppercase
  const normalized = reg.toUpperCase().replace(/\s+/g, '');

  // Validate UK format (simplified)
  if (normalized.match(/^[A-Z]{2}\d{2}[A-Z]{3}$/)) {
    // Format as XX00 XXX
    return `${normalized.slice(0, 4)} ${normalized.slice(4)}`;
  }

  return reg.toUpperCase();
}

/**
 * Calculate due date from payment terms
 */
function calculateDueDate(invoiceDate: string, paymentTerms: string): string | null {
  const date = new Date(invoiceDate);
  const termsLower = paymentTerms.toLowerCase();

  if (termsLower.includes('receipt')) {
    return invoiceDate;
  }

  const daysMatch = termsLower.match(/(\d+)\s*days?/);
  if (daysMatch) {
    const days = parseInt(daysMatch[1]);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  // Default to 30 days
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
}

/**
 * Convert file to base64 (for future Gemini integration)
 */
async function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Batch process multiple invoices
 */
export async function batchProcessInvoices(
  files: File[],
  options: {
    parallel?: boolean;
    maxConcurrent?: number;
    onProgress?: (processed: number, total: number) => void;
  } = {}
): Promise<ProcessingResult[]> {
  const { parallel = true, maxConcurrent = 3, onProgress } = options;

  if (!parallel) {
    const results: ProcessingResult[] = [];
    for (let i = 0; i < files.length; i++) {
      results.push(await processInvoiceWithAI(files[i]));
      onProgress?.(i + 1, files.length);
    }
    return results;
  }

  const results: ProcessingResult[] = [];
  const processing = new Set<Promise<void>>();

  for (let i = 0; i < files.length; i++) {
    const processFile = async () => {
      const result = await processInvoiceWithAI(files[i]);
      results[i] = result;
      onProgress?.(results.filter(Boolean).length, files.length);
    };

    const promise = processFile();
    processing.add(promise);
    promise.then(() => processing.delete(promise));

    if (processing.size >= maxConcurrent) {
      await Promise.race(processing);
    }
  }

  await Promise.all(processing);
  return results;
}

/**
 * Learn from user corrections to improve future extractions
 */
export class InvoiceLearningSystem {
  private corrections: Map<string, any[]> = new Map();

  recordCorrection(
    originalData: ExtractedInvoiceData,
    correctedData: ExtractedInvoiceData,
    supplier: string
  ) {
    if (!this.corrections.has(supplier)) {
      this.corrections.set(supplier, []);
    }

    this.corrections.get(supplier)!.push({
      original: originalData,
      corrected: correctedData,
      timestamp: new Date(),
    });

    this.saveCorrections();
  }

  getSupplierPatterns(supplier: string): any {
    return this.corrections.get(supplier) || [];
  }

  private saveCorrections() {
    if (typeof window !== 'undefined') {
      const data = Array.from(this.corrections.entries());
      localStorage.setItem('invoice_corrections', JSON.stringify(data));
    }
  }

  loadCorrections() {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('invoice_corrections');
      if (saved) {
        const data = JSON.parse(saved);
        this.corrections = new Map(data);
      }
    }
  }
}

// Export singleton instance
export const learningSystem = new InvoiceLearningSystem();
