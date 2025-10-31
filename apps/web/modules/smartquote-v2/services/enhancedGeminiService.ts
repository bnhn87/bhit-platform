// ========================================
// SmartQuote v2.0 - Enhanced Gemini Service
// ========================================
// Improvements:
// - Multi-pass parsing with validation
// - Confidence scoring for each product
// - Retry logic with adaptive prompts
// - Better error recovery
// - Feedback loops for corrections

import { GoogleGenAI, Type } from "@google/genai";
import { EnhancedParseResult } from '../types';

if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Enhanced response schema with confidence
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        details: {
            type: Type.OBJECT,
            properties: {
                client: { type: Type.STRING, description: "Client name" },
                project: { type: Type.STRING, description: "Project name" },
                quoteRef: { type: Type.STRING, description: "Quote reference" },
            }
        },
        products: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    lineNumber: {
                        type: Type.INTEGER,
                        description: "Line number from document",
                    },
                    productCode: {
                        type: Type.STRING,
                        description: "Product code (remove ES- or ESSENTIALS_ prefix)",
                    },
                    rawDescription: {
                        type: Type.STRING,
                        description: "Full original text from document",
                    },
                    cleanDescription: {
                        type: Type.STRING,
                        description: "Human-readable summary with dimensions",
                    },
                    quantity: {
                        type: Type.INTEGER,
                        description: "Item quantity",
                    },
                    confidence: {
                        type: Type.NUMBER,
                        description: "Confidence score 0-1 for this extraction",
                    },
                },
                required: ["lineNumber", "productCode", "rawDescription", "cleanDescription", "quantity", "confidence"],
            },
        },
        overallConfidence: {
            type: Type.NUMBER,
            description: "Overall parsing confidence 0-1",
        },
        warnings: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Parsing warnings or uncertainties",
        }
    },
    required: ["products", "overallConfidence"]
};

const systemInstruction = `You are an expert furniture quote parser. Extract data with HIGH ACCURACY and confidence scoring.

**CRITICAL RULES:**
1. Extract ALL products with product codes
2. Remove "ES-" or "ESSENTIALS_" prefix from codes
3. Skip: tray, access door, delivery & installation, insert (unless with pedestal)
4. Power items: Consolidate lines with "power", "pixel", "pds", "data", "usb", "module"

**CONFIDENCE SCORING:**
- 0.9-1.0: Product code clearly visible, quantity obvious, description complete
- 0.7-0.8: Product code visible but formatting unusual, quantity clear
- 0.5-0.6: Product code partial, quantity needs inference
- 0.3-0.4: Unclear product code, quantity uncertain
- Below 0.3: Do not include

**DESCRIPTIONS:**
- rawDescription: EXACT original text, NO changes
- cleanDescription: Product type + ALL dimensions (L2800 x W1600 x H750). Keep sizing, remove colors/finishes.

**WARNINGS:**
Add warning if:
- Product code format unusual
- Quantity seems excessive (>50)
- Missing standard dimensions
- Unclear line structure

Return empty products array if none found.`;

// Validation functions
const validateProduct = (product: any): boolean => {
    return (
        product.quantity > 0 &&
        product.quantity < 1000 &&
        product.productCode.length > 0 &&
        product.productCode.length < 50 &&
        product.rawDescription.length > 0 &&
        product.confidence >= 0.3
    );
};

// Enhanced confidence calculation
const calculateEnhancedConfidence = (product: any): number => {
    let confidence = product.confidence || 0.5;
    
    // Boost confidence for well-formed product codes
    if (/^[A-Z0-9\-_]{3,20}$/i.test(product.productCode)) {
        confidence += 0.1;
    }
    
    // Boost for reasonable quantity
    if (product.quantity > 0 && product.quantity < 100) {
        confidence += 0.05;
    }
    
    // Boost for sizing info
    if (/\b[LWH]?\d{3,4}/.test(product.cleanDescription)) {
        confidence += 0.1;
    }
    
    // Penalty for very long or very short codes
    if (product.productCode.length < 3 || product.productCode.length > 30) {
        confidence -= 0.15;
    }
    
    return Math.max(0, Math.min(confidence, 1.0));
};

// Multi-pass parsing with adaptive prompts
const attemptParse = async (
    content: any[],
    attempt: number,
    previousErrors?: string[]
): Promise<EnhancedParseResult> => {
    const startTime = Date.now();
    
    // Separate text and file content
    const textParts = content.filter((part): part is string => typeof part === 'string');
    const fileParts = content.filter((part): part is { mimeType: string; data: string } => 
        typeof part !== 'string'
    );

    const combinedText = textParts.join('\n\n---\n\n');
    
    // Build adaptive prompt based on attempt and previous errors
    let promptText = "Extract products and quote details from the documents below:";
    
    if (attempt > 1) {
        promptText += `\n\nATTEMPT ${attempt}: Previous attempts had issues. Please:`;
        if (previousErrors?.includes('no_products')) {
            promptText += "\n- Look more carefully for product codes in unusual formats";
            promptText += "\n- Check for codes in brackets, at line start, or embedded in text";
        }
        if (previousErrors?.includes('low_confidence')) {
            promptText += "\n- Be more flexible with code formats (XX-XXX, XXXX_XX, etc.)";
            promptText += "\n- Extract all visible product identifiers";
        }
        if (previousErrors?.includes('missing_quantities')) {
            promptText += "\n- Look for quantities even if format is non-standard";
            promptText += "\n- Check for written numbers (one, two, etc.)";
        }
    }
    
    const requestParts: any[] = [{ text: promptText }];
    
    if (combinedText.trim()) {
        requestParts.push({ text: combinedText });
    }
    
    fileParts.forEach(part => {
        requestParts.push({ inlineData: { mimeType: part.mimeType, data: part.data } });
    });
    
    if (requestParts.length <= 1) {
        throw new Error("No content provided to parse");
    }
    
    // Adjust AI parameters based on attempt
    const temperature = 0.3 + (attempt * 0.05); // Increase flexibility on retries
    const topP = 0.9 + (attempt * 0.02);
    const topK = Math.min(40 + (attempt * 10), 60);
    
    const response = await ai.models.generateContent({
        model: "gemini-2.0-flash-exp",
        contents: { parts: requestParts },
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: responseSchema,
            temperature,
            topP,
            topK,
        },
    });
    
    const duration = Date.now() - startTime;
    const jsonText = response.text?.trim() || '';
    const parsedData = JSON.parse(jsonText);
    
    // Validate and enhance products
    const validProducts = (parsedData.products || [])
        .filter(validateProduct)
        .map((p: any) => ({
            ...p,
            confidence: calculateEnhancedConfidence(p)
        }));

    // Separate high and low confidence products
    const highConfidence = validProducts.filter((p: any) => p.confidence >= 0.7);
    const lowConfidence = validProducts.filter((p: any) => p.confidence < 0.7);

    const result: EnhancedParseResult = {
        products: highConfidence,
        excludedProducts: lowConfidence.length > 0 ? lowConfidence : undefined,
        details: parsedData.details || {},
        confidenceScore: parsedData.overallConfidence ||
            (validProducts.reduce((sum: number, p: any) => sum + p.confidence, 0) / (validProducts.length || 1)),
        parseMetadata: {
            duration,
            retryCount: attempt - 1,
            model: "gemini-2.0-flash-exp",
            temperature,
        },
        warnings: parsedData.warnings || []
    };
    
    return result;
};

// Main parse function with intelligent retry
export const parseQuoteContentEnhanced = async (
    content: any[],
    options: {
        maxRetries?: number;
        minConfidence?: number;
        includeLowConfidence?: boolean;
    } = {}
): Promise<EnhancedParseResult> => {
    const maxRetries = options.maxRetries || 3;
    const minConfidence = options.minConfidence || 0.3;
    const includeLowConfidence = options.includeLowConfidence ?? true;
    
    let lastError: Error | null = null;
    let lastResult: EnhancedParseResult | null = null;
    const errors: string[] = [];
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await attemptParse(content, attempt, errors);
            lastResult = result;
            
            // Success criteria
            const hasProducts = result.products.length > 0;
            const hasGoodConfidence = result.confidenceScore >= minConfidence;
            
            if (hasProducts && hasGoodConfidence) {
                return result;
            }
            
            // Track issues for next attempt
            if (!hasProducts) errors.push('no_products');
            if (!hasGoodConfidence) errors.push('low_confidence');
            if (result.products.some(p => !p.quantity)) errors.push('missing_quantities');
            
            if (attempt < maxRetries) {
                console.log(`Attempt ${attempt}: Confidence ${result.confidenceScore.toFixed(2)}, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                continue;
            }
            
            // Last attempt - return what we have
            return result;
            
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            
            if (attempt < maxRetries) {
                console.log(`Attempt ${attempt} failed:`, lastError.message);
                await new Promise(resolve => setTimeout(resolve, 1500 * attempt));
                continue;
            }
        }
    }
    
    // All attempts failed
    if (lastResult) {
        // Return partial results with warning
        return {
            ...lastResult,
            warnings: [
                ...(lastResult.warnings || []),
                "Parsing completed with lower than desired confidence. Please review carefully."
            ]
        };
    }
    
    throw new Error(
        lastError?.message || 
        "Failed to parse content after multiple attempts. Please check document format."
    );
};
