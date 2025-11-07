
import { GoogleGenAI, Type } from "@google/genai";

import { ParseResult, ParseContent, ParsedProduct } from '../types';

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

/**
 * JSON schema defining the structure of the AI's response
 * This ensures consistent parsing results from Google Gemini AI
 */
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        details: {
            type: Type.OBJECT,
            properties: {
                client: { type: Type.STRING, description: "The client's name, if found." },
                project: { type: Type.STRING, description: "The project name, if found." },
                quoteRef: { type: Type.STRING, description: "The quote reference number, if found." },
                deliveryAddress: { type: Type.STRING, description: "The SITE/INSTALLATION address or postcode (UK format: XX## #XX), if found." },
                collectionAddress: { type: Type.STRING, description: "The COLLECTION/WAREHOUSE address if different from site, if found." },
                allAddresses: {
                    type: Type.ARRAY,
                    description: "All addresses found in the quote with their types",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            type: { type: Type.STRING, description: "Address type: site, collection, client, or other" },
                            address: { type: Type.STRING, description: "The full address including postcode" }
                        }
                    }
                }
            }
        },
        products: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    lineNumber: {
                        type: Type.INTEGER,
                        description: "The original line number from the works order text, if available. If not, use the line index.",
                    },
                    productCode: {
                        type: Type.STRING,
                        description: "The product code, which is a short identifier like `ES-FLX-4P-2816-A`. If the code starts with `ES-` or `ESSENTIALS_`, remove that prefix.",
                    },
                    rawDescription: {
                        type: Type.STRING,
                        description: "The FULL, UNMODIFIED, RAW text of the product line from the document.",
                    },
                     cleanDescription: {
                        type: Type.STRING,
                        description: "A simplified, human-readable summary of the raw description. E.g., for `ESSENTIALS_FLX_4P_L2800...`, this would be `FLX 4P L2800 x W1600 x H750`. For `JUST A CHAIR_FINISH_BLACK`, this would be `Just A Chair Black`."
                    },
                    quantity: {
                        type: Type.INTEGER,
                        description: "The quantity of the item.",
                    },
                },
                required: ["lineNumber", "productCode", "rawDescription", "cleanDescription", "quantity"],
            },
        }
    },
     required: ["products"]
};

const systemInstruction = `Extract furniture quote data into JSON. Parse product lines and quote metadata.

**Quote Details:** Extract ALL addresses found:
- client: Company/customer name
- project: Project/job reference
- quoteRef: Quote reference number
- deliveryAddress: The SITE/INSTALLATION address (WHERE WORK WILL BE DONE)
  * Look for: "Site:", "Installation at:", "Install at:", "Delivery to:"
- collectionAddress: The COLLECTION/WAREHOUSE address if different from site
  * Look for: "Collection:", "Collect from:", "Warehouse:", "Dispatch from:"
- allAddresses: Array of ALL addresses found with types (site/collection/client/other)
  * Include full address with UK postcode (format: XX## #XX)

**Product Extraction:**
1. Extract items with product codes (in brackets/parentheses or at line start)
2. Remove "ES-" or "ESSENTIALS_" prefix from codes
3. Skip: "tray", "access door", "delivery & installation", "insert" (unless with "pedestal")
4. Power items: any line with "power"/"pixel"/"pds"/"data"/"usb"/"module"

**Descriptions:**
- rawDescription: FULL ORIGINAL TEXT unchanged
- cleanDescription: Product type + dimensions only. KEEP all sizing (L2000, W800, H750, D1200). Remove colors/finishes.
  Examples: "FLX_4P_L2800xW1600_Black" → "FLX 4P L2800 x W1600"

Return empty array if no products found.`;


const promptText = "Extract products and quote details from the documents below:";

/**
 * Validates a parsed product to ensure it has all required fields and sensible values
 * @param product - The parsed product to validate
 * @returns true if the product is valid, false otherwise
 */
const validateParsedProduct = (product: ParsedProduct): boolean => {
    return (
        product.quantity > 0 &&
        product.quantity < 1000 && // Sanity check
        product.productCode.length > 0 &&
        product.productCode.length < 50 &&
        product.rawDescription.length > 0
    );
};

/**
 * Calculates a confidence score (0-1) for how accurately we believe the product was parsed
 * Higher scores indicate the AI is more confident in the extraction accuracy
 * @param product - The parsed product to score
 * @returns Confidence score between 0 and 1
 */
const calculateConfidence = (product: ParsedProduct): number => {
    let confidence = 0.5; // Base confidence

    // Higher confidence if product code looks well-formed
    if (/^[A-Z0-9\-_]{3,20}$/i.test(product.productCode)) {
        confidence += 0.2;
    }

    // Higher confidence if quantity is reasonable
    if (product.quantity > 0 && product.quantity < 100) {
        confidence += 0.15;
    }

    // Higher confidence if description contains sizing info
    if (/\b[LWH]?\d{3,4}/.test(product.cleanDescription) || /\bD\d{3,4}/.test(product.cleanDescription)) {
        confidence += 0.15;
    }

    return Math.min(confidence, 1.0);
};

const applyStandardNamingRules = (products: ParsedProduct[]): { included: ParsedProduct[], excluded: ParsedProduct[] } => {
    // Step 1: Separate included and excluded items instead of filtering out
    const included: ParsedProduct[] = [];
    const excluded: ParsedProduct[] = [];

    products.forEach(product => {
        const lowerDesc = product.rawDescription.toLowerCase();
        const _lowerCode = product.productCode.toLowerCase();
        
        // Items that are typically excluded but might be useful
        const isAccessory = lowerDesc.includes('tray') || 
                           lowerDesc.includes('access door') || 
                           (lowerDesc.includes('insert') && !lowerDesc.includes('pedestal'));
        
        // Items that should always be excluded
        const isNonProduct = lowerDesc.includes('delivery & installation') ||
                           lowerDesc.includes('section') || 
                           lowerDesc.includes('heading') || 
                           lowerDesc.includes('total');
        
        if (isNonProduct) {
            // Skip entirely - these are never products
            return;
        } else if (isAccessory) {
            // Put in excluded array for user review
            excluded.push(product);
        } else {
            // Include by default
            included.push(product);
        }
    });

    // Step 2: Separate power items from regular items (from included products only)
    const powerKeywords = ['power', 'pixel', 'pds', 'data', 'usb', 'module'];
    const powerItems: ParsedProduct[] = [];
    const regularItems: ParsedProduct[] = [];

    included.forEach(product => {
        const lowerCode = product.productCode.toLowerCase();
        const lowerDesc = product.rawDescription.toLowerCase();
        
        if (powerKeywords.some(kw => lowerCode.includes(kw) || lowerDesc.includes(kw))) {
            powerItems.push(product);
        } else {
            regularItems.push(product);
        }
    });

    // Step 3: Format descriptions with "Line X –" prefix and sizing fallback
    const formatProduct = (product: ParsedProduct): ParsedProduct => {
        let cleanDesc = product.cleanDescription;
        
        // Fallback: If AI removed sizing, try to extract it from productCode or rawDescription
        const hasSizing = /\b[LWH]?\d{3,4}(?:\s*[xX×]\s*[LWH]?\d{3,4})*\b/.test(cleanDesc) || /\bD\d{3,4}\b/.test(cleanDesc);
        
        if (!hasSizing) {
            // Try to extract sizing from product code first
            const codeSize = product.productCode.match(/\b[LWH]?\d{3,4}(?:[xX×][LWH]?\d{3,4})*\b/g);
            // Try to extract sizing from raw description as backup
            const rawSize = product.rawDescription.match(/\b[LWH]?\d{3,4}(?:\s*[xX×]\s*[LWH]?\d{3,4})*\b/g);
            
            if (codeSize) {
                cleanDesc += ` ${codeSize[0]}`;
            } else if (rawSize) {
                cleanDesc += ` ${rawSize[0]}`;
            }
        }
        
        // Convert diameter variations to consistent D notation
        cleanDesc = cleanDesc.replace(/\bDIA\s*(\d+)\b/gi, 'D$1');
        cleanDesc = cleanDesc.replace(/\bDIAMETER\s*(\d+)\b/gi, 'D$1');
        
        // Clean up extra spaces and formatting
        cleanDesc = cleanDesc.trim().replace(/\s+/g, ' ');
        cleanDesc = cleanDesc.replace(/^[-–—\s]+|[-–—\s]+$/g, ''); // Remove leading/trailing dashes and spaces
        
        return {
            ...product,
            description: `Line ${product.lineNumber} – ${cleanDesc}`,
            cleanDescription: cleanDesc
        };
    };

    // Step 4: Process regular items
    const processedRegularItems = regularItems.map(formatProduct);

    // Step 5: Consolidate power items if any exist
    if (powerItems.length > 0) {
        const totalPowerQuantity = powerItems.reduce((sum, item) => sum + item.quantity, 0);
        const firstPowerItem = powerItems[0];
        
        const consolidatedPowerItem: ParsedProduct = {
            lineNumber: firstPowerItem.lineNumber,
            productCode: 'POWER-MODULE',
            rawDescription: 'Consolidated Power/Data Modules',
            cleanDescription: 'Consolidated Power/Data Modules',
            quantity: totalPowerQuantity,
            description: `Line ${firstPowerItem.lineNumber} – Consolidated Power/Data Modules`
        };
        
        // Add consolidated power item at the end
        const finalIncluded = [...processedRegularItems, consolidatedPowerItem];
        return { 
            included: finalIncluded, 
            excluded: excluded.map(formatProduct) 
        };
    }

    return { 
        included: processedRegularItems, 
        excluded: excluded.map(formatProduct) 
    };
};

// Helper function for retry logic
const attemptParse = async (content: ParseContent, attempt: number): Promise<ParseResult> => {
    // Separate text content from file (image) content
    const textParts = content.filter((part): part is string => typeof part === 'string');
    const fileParts = content.filter((part): part is { mimeType: string; data: string; } => typeof part !== 'string');

    // Combine all text-based content into a single string for the model
    const combinedText = textParts.join('\n\n---\n\n');

    const requestContentParts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [];

    // Enhance prompt on retry attempts
    const enhancedPromptText = attempt > 1
        ? `${promptText}\n\nBe more flexible with product code formats. Look for patterns like: XX-XXX, XXXX_XX, etc. Extract all visible product identifiers.`
        : promptText;

    // Add the prompt
    requestContentParts.push({ text: enhancedPromptText });

    // Add the combined text if there is any
    if (combinedText.trim()) {
        requestContentParts.push({ text: combinedText });
    }

    // Add any non-text (image) parts
    fileParts.forEach(part => {
         requestContentParts.push({ inlineData: { mimeType: part.mimeType, data: part.data } });
    });

    // The model expects content to parse
    if (requestContentParts.length <= 1) {
        throw new Error("No content was provided to parse.");
    }

    const contents = {
         parts: requestContentParts
    };

    const response = await getAI().models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature: 0.3, // Increased from 0.1 for more flexibility
            topP: 0.9, // Increased from 0.8 for more creativity
            topK: 40, // Increased from 20 for better pattern recognition
        },
    });

    const jsonText = response.text?.trim() || '';
    const parsedData = JSON.parse(jsonText) as Partial<ParseResult>;

    // Basic validation and providing defaults
    const result: ParseResult = {
        products: [],
        details: {}
    };

    if (parsedData.products && Array.isArray(parsedData.products)) {
        // Filter and validate products
        const validProducts = parsedData.products.filter((item): item is ParsedProduct =>
            item &&
            typeof item.lineNumber === 'number' &&
            typeof item.productCode === 'string' &&
            typeof item.rawDescription === 'string' &&
            typeof item.cleanDescription === 'string' &&
            typeof item.quantity === 'number' &&
            validateParsedProduct(item) // Add validation
        );

        // Add confidence scores
        const productsWithConfidence = validProducts.map(product => ({
            ...product,
            confidence: calculateConfidence(product)
        }));

        // Apply standard naming rules post-processing
        const { included, excluded } = applyStandardNamingRules(productsWithConfidence);
        result.products = included;
        result.excludedProducts = excluded;
    }

    if (parsedData.details && typeof parsedData.details === 'object') {
        result.details = parsedData.details;
    }

    return result;
};

/**
 * Parses quote content using Google Gemini AI with intelligent retry logic
 * This is the main entry point for AI-powered quote parsing
 *
 * @param content - Array of text strings or file objects to parse
 * @returns Parsed quote data including products, details, and excluded items
 * @throws Error if parsing fails after all retry attempts
 *
 * @example
 * ```typescript
 * const result = await parseQuoteContent([
 *   "Quote for ABC Corp\nFLX-4P-2816 x5\nCHAIR x10"
 * ]);
 * console.log(result.products); // Array of parsed products
 * ```
 */
export const parseQuoteContent = async (content: ParseContent): Promise<ParseResult> => {
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await attemptParse(content, attempt);

            // If we got products, return success
            if (result.products.length > 0) {
                return result;
            }

            // If no products found, retry (unless it's the last attempt)
            if (attempt < MAX_RETRIES) {
                if (process.env.NODE_ENV === 'development') {
                    console.log(`[SmartQuote] Attempt ${attempt} found no products, retrying...`);
                }
                continue;
            }

            return result;

        } catch (error: unknown) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < MAX_RETRIES) {
                if (process.env.NODE_ENV === 'development') {
                    console.error(`[SmartQuote] Parse attempt ${attempt} failed:`, lastError.message);
                }
                // Wait briefly before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                continue;
            }
        }
    }

    // All attempts failed
    throw new Error(lastError?.message || "Failed to communicate with the AI service or parse its response.");
};
