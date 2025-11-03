import { GoogleGenAI, Type } from "@google/genai";
import { ParseResult, ParseContent, ParsedProduct } from '../types';
import { loadConfig } from './configService';

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

// Get all product codes from the catalogue for fuzzy matching
const getCatalogueProductCodes = (): string[] => {
    const config = loadConfig();
    return Object.keys(config.productCatalogue);
};

// Find best matching product from catalogue using fuzzy logic
const findBestCatalogueMatch = (productCode: string, description: string): string | null => {
    const catalogue = loadConfig().productCatalogue;
    const catalogueKeys = Object.keys(catalogue);

    // Clean the product code for matching
    const cleanCode = productCode
        .toUpperCase()
        .replace(/^ES[-_]/, '')
        .replace(/^ESSENTIALS[-_]/, '')
        .trim();

    const cleanDesc = description.toUpperCase();

    // 1. Try exact match first
    if (catalogue[cleanCode]) {
        return cleanCode;
    }

    // 2. Try case-insensitive exact match
    const exactMatch = catalogueKeys.find(key => key.toUpperCase() === cleanCode);
    if (exactMatch) {
        return exactMatch;
    }

    // 2.5. Check for specific FLX formats like "FLX-4P-2816-A"
    const flxFormatMatch = cleanCode.match(/FLX[-_]?(\d+)P[-_]/);
    if (flxFormatMatch) {
        const personCount = flxFormatMatch[1];

        // Try to find specific size variant first
        const sizeMatch = cleanCode.match(/(\d{4})/);
        if (sizeMatch && personCount !== '1') {
            const size = sizeMatch[1];
            const specificKey = `FLX-COWORK-${personCount}P-L${size}`;
            if (catalogue[specificKey]) return specificKey;
        }

        // Otherwise return generic FLX variant
        const genericKey = `FLX ${personCount}P`;
        if (catalogue[genericKey]) return genericKey;

        // Also try alternative formats
        const altKey = `${personCount}P FLX`;
        if (catalogue[altKey]) return altKey;
    }

    // 3. Extract key patterns from the code/description
    const patterns = {
        flx4p: /FLX[-_\s]*4P|4P[-_\s]*FLX|FOUR.?PERSON.*FLX|FLX[-_]4P[-_]/i,
        flx6p: /FLX[-_\s]*6P|6P[-_\s]*FLX|SIX.?PERSON.*FLX|FLX[-_]6P[-_]/i,
        flx8p: /FLX[-_\s]*8P|8P[-_\s]*FLX|EIGHT.?PERSON.*FLX|FLX[-_]8P[-_]/i,
        flxSingle: /FLX[-_\s]*SINGLE|SINGLE[-_\s]*FLX|FLX[-_\s]*1P/i,
        bassRect: /BASS.*RECT|BASS.*RECTANGULAR/i,
        bassPill: /BASS.*PILL/i,
        justAChair: /JUST.?A.?CHAIR|JAC/i,
        workaround: /WORKAROUND|WA[-_]/i,
        woody: /WOODY/i,
        credenza: /CREDENZA|ENZA|ENZ/i,
        cage: /CAGE/i,
        cafe: /CAFE/i,
        cat: /CAT[-_]/i,
        hiLo: /HI[-_]?LO/i,
        pedestal: /PEDESTAL|PED[-_]/i,
        locker: /LOCKER/i,
        planter: /PLANTER/i,
        roller: /ROLLER|ROL[-_]/i,
        surf: /SURF/i,
    };

    // Check both code and description for patterns
    const combinedText = `${cleanCode} ${cleanDesc}`;

    // FLX products
    if (patterns.flx4p.test(combinedText)) {
        // Try to find dimensions
        const sizeMatch = combinedText.match(/L?(\d{4})|(\d{4})MM/);
        if (sizeMatch) {
            const size = sizeMatch[1] || sizeMatch[2];
            const flxKey = `FLX-COWORK-4P-L${size}`;
            if (catalogue[flxKey]) return flxKey;
        }
        return 'FLX 4P'; // Use generic if no specific size found
    }

    if (patterns.flx6p.test(combinedText)) {
        const sizeMatch = combinedText.match(/L?(\d{4})|(\d{4})MM/);
        if (sizeMatch) {
            const size = sizeMatch[1] || sizeMatch[2];
            const flxKey = `FLX-COWORK-6P-L${size}`;
            if (catalogue[flxKey]) return flxKey;
        }
        return 'FLX 6P';
    }

    if (patterns.flx8p.test(combinedText)) {
        const sizeMatch = combinedText.match(/L?(\d{4})|(\d{4})MM/);
        if (sizeMatch) {
            const size = sizeMatch[1] || sizeMatch[2];
            const flxKey = `FLX-COWORK-8P-L${size}`;
            if (catalogue[flxKey]) return flxKey;
        }
        return 'FLX 8P';
    }

    if (patterns.flxSingle.test(combinedText)) {
        const sizeMatch = combinedText.match(/L?(\d{4})|(\d{4})MM/);
        if (sizeMatch) {
            const size = sizeMatch[1] || sizeMatch[2];
            const flxKey = `FLX-SINGLE-L${size}`;
            if (catalogue[flxKey]) return flxKey;
        }
        return 'FLX Single';
    }

    // BASS products
    if (patterns.bassRect.test(combinedText)) {
        return 'Bass Rect 2400x1200';
    }

    if (patterns.bassPill.test(combinedText)) {
        return 'Bass Pill';
    }

    // Other specific products
    if (patterns.justAChair.test(combinedText)) {
        return 'Just A Chair';
    }

    if (patterns.hiLo.test(combinedText)) {
        if (/DUO/i.test(combinedText)) {
            return 'Hi-Lo Duo';
        }
        return 'Hi-Lo Single';
    }

    if (patterns.pedestal.test(combinedText)) {
        return 'PEDESTAL';
    }

    if (patterns.locker.test(combinedText)) {
        return 'Locker Carcass';
    }

    if (patterns.planter.test(combinedText)) {
        return 'Planter Shell';
    }

    // WORKAROUND/WOODY products
    if (patterns.workaround.test(combinedText) || patterns.woody.test(combinedText)) {
        // Check if it's circular/round
        if (/CIRC|ROUND|RND|D\d{4}/i.test(combinedText)) {
            const diaMatch = combinedText.match(/D(\d{4})|DIA.?(\d{4})|(\d{4}).?DIA/);
            if (diaMatch) {
                const dia = diaMatch[1] || diaMatch[2] || diaMatch[3];
                const waKey = `WORKAROUND-CIRCULAR-D${dia}`;
                if (catalogue[waKey]) return waKey;
            }
            return 'WORKAROUND-CIRCULAR-D1200'; // Default circular
        }
        // Otherwise it's rectangular meeting table
        const sizeMatch = combinedText.match(/L?(\d{4})|(\d{4})MM/);
        if (sizeMatch) {
            const size = sizeMatch[1] || sizeMatch[2];
            const waKey = `WORKAROUND-MEETING-L${size}`;
            if (catalogue[waKey]) return waKey;
        }
        return 'WORKAROUND-MEETING-L2000'; // Default meeting
    }

    // CREDENZA/ENZA
    if (patterns.credenza.test(combinedText)) {
        const sizeMatch = combinedText.match(/L?(\d{4})|(\d{4})MM/);
        if (sizeMatch) {
            const size = sizeMatch[1] || sizeMatch[2];
            const credKey = `CREDENZA-L${size}`;
            if (catalogue[credKey]) return credKey;
        }
        return 'CREDENZA-L1600'; // Default size
    }

    // CAGE products
    if (patterns.cage.test(combinedText)) {
        if (/SOFA/i.test(combinedText)) {
            const sizeMatch = combinedText.match(/L?(\d{4})|(\d{4})MM/);
            if (sizeMatch) {
                const size = sizeMatch[1] || sizeMatch[2];
                const cageKey = `CAGE-SOFA-L${size}`;
                if (catalogue[cageKey]) return cageKey;
            }
            return 'CAGE-SOFA-L1800';
        }
        if (/STEEL|SC/i.test(combinedText)) {
            return 'CAGE-STEEL-CUBE';
        }
        if (/OPEN/i.test(combinedText)) {
            return 'CAGE-OPEN-CUBE';
        }
        return 'CAGE-BASE-CUPBOARD';
    }

    // ROLLER
    if (patterns.roller.test(combinedText)) {
        const sizeMatch = combinedText.match(/L?(\d{4})|(\d{4})MM/);
        if (sizeMatch) {
            const size = sizeMatch[1] || sizeMatch[2];
            const rolKey = `ROLLER-L${size}`;
            if (catalogue[rolKey]) return rolKey;
        }
        return 'ROLLER-L2400';
    }

    // 4. Try partial matching on product code components
    const codeComponents = cleanCode.split(/[-_\s]+/);

    for (const catalogueKey of catalogueKeys) {
        const keyComponents = catalogueKey.toUpperCase().split(/[-_\s]+/);

        // Check if at least 2 components match
        const matchCount = codeComponents.filter(comp =>
            keyComponents.some(keyComp => keyComp.includes(comp) || comp.includes(keyComp))
        ).length;

        if (matchCount >= 2) {
            return catalogueKey;
        }
    }

    // 5. If no match found but it's clearly furniture, use a default based on type
    if (/DESK|WORKSTATION/i.test(combinedText)) {
        return 'FLX-SINGLE-L1400'; // Default single desk
    }
    if (/TABLE/i.test(combinedText)) {
        if (/MEETING/i.test(combinedText)) {
            return 'WORKAROUND-MEETING-L2000';
        }
        if (/COFFEE/i.test(combinedText)) {
            return 'Arne Coffee';
        }
        return 'CAFE-ROUND-D1000'; // Default small table
    }
    if (/CHAIR/i.test(combinedText)) {
        return 'Just A Chair';
    }
    if (/STORAGE|CUPBOARD|CABINET/i.test(combinedText)) {
        return 'CREDENZA-L1600';
    }
    if (/SOFA|SEATING/i.test(combinedText)) {
        return 'CAGE-SOFA-L1800';
    }

    return null;
};

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
                        description: "The product code extracted. Be flexible with formats. Look for codes in brackets, after product names, or standalone.",
                    },
                    rawDescription: {
                        type: Type.STRING,
                        description: "The FULL, UNMODIFIED, RAW text of the product line from the document.",
                    },
                    cleanDescription: {
                        type: Type.STRING,
                        description: "A simplified, human-readable summary. Include all dimensions.",
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

const systemInstruction = `Extract furniture quote data into JSON. Be FLEXIBLE with product recognition.

**Quote Details:** Extract ALL addresses found:
- client: Company/customer name
- project: Project/job reference
- quoteRef: Quote reference number
- deliveryAddress: The SITE/INSTALLATION address (WHERE WORK WILL BE DONE)
- collectionAddress: The COLLECTION/WAREHOUSE address if different from site
- allAddresses: Array of ALL addresses found with types

**Product Extraction - BE FLEXIBLE:**
1. Look for product codes in various formats:
   - In brackets/parentheses: "Desk (FLX-4P)"
   - After colons: "Product: FLX-4P"
   - At line start: "FLX-4P Workstation"
   - Embedded in description: "FLX 4 Person workstation"
   - With underscores: "FLX_4P_L2800"
   - With variations: "4P FLX", "FLX FOUR PERSON", "FLX-4-PERSON"

2. Common product patterns to recognize:
   - FLX range: Single, 4P, 6P, 8P (4/6/8 person)
   - BASS products: Rectangle (Rect), Pill
   - Just A Chair (JAC)
   - Hi-Lo (Single/Duo)
   - Workaround/WA/Woody tables
   - Credenza/Enza storage
   - Cage furniture
   - Pedestals
   - Power modules

3. Extract ANY line that looks like furniture:
   - Even if code format is unusual
   - Include items with just descriptions
   - Include items with dimensions (L2000, W800, H750, D600)

4. For productCode, extract the most specific identifier you can find.
   If no clear code, create one from the description (e.g., "DESK-L1400" from "1400mm desk")

5. Power items: Include anything with "power", "pixel", "pds", "data", "usb", "module", "electrical"

6. Skip only obvious non-products: headers, totals, delivery notes, section dividers

Return empty array ONLY if truly no products found. BE INCLUSIVE rather than exclusive.`;

const promptText = "Extract products and quote details. Be flexible with product formats and include all furniture items:";

// Enhanced post-processing to use catalogue for unknown products
const enhanceProductsWithCatalogue = (products: ParsedProduct[]): ParsedProduct[] => {
    const config = loadConfig();

    return products.map(product => {
        // Try to find a catalogue match
        const catalogueMatch = findBestCatalogueMatch(product.productCode, product.rawDescription);

        if (catalogueMatch) {
            // Use the catalogue code but preserve original for reference
            const catalogueProduct = config.productCatalogue[catalogueMatch];

            // Add catalogue info to the description if we found a match
            const enhancedDescription = product.cleanDescription +
                (catalogueProduct ? ` [Matched: ${catalogueMatch}]` : '');

            return {
                ...product,
                productCode: catalogueMatch, // Use the matched catalogue code
                cleanDescription: enhancedDescription,
                // Store original code in description if different
                description: product.productCode !== catalogueMatch
                    ? `Line ${product.lineNumber} – ${product.cleanDescription} (Original: ${product.productCode})`
                    : `Line ${product.lineNumber} – ${product.cleanDescription}`
            };
        }

        // If no match found, keep original but mark as needing review
        return {
            ...product,
            description: `Line ${product.lineNumber} – ${product.cleanDescription} [Needs Time Entry]`
        };
    });
};

// Apply standard naming rules with enhanced matching
const applyStandardNamingRules = (products: ParsedProduct[]): { included: ParsedProduct[], excluded: ParsedProduct[] } => {
    const included: ParsedProduct[] = [];
    const excluded: ParsedProduct[] = [];

    products.forEach(product => {
        const lowerDesc = product.rawDescription.toLowerCase();

        // Items that are typically excluded but might be useful
        const isAccessory = lowerDesc.includes('tray') ||
                           lowerDesc.includes('access door') ||
                           (lowerDesc.includes('insert') && !lowerDesc.includes('pedestal'));

        // Items that should always be excluded
        const isNonProduct = lowerDesc.includes('delivery & installation') ||
                           lowerDesc.includes('section') ||
                           lowerDesc.includes('heading') ||
                           lowerDesc.includes('total') ||
                           lowerDesc.includes('subtotal');

        if (isNonProduct) {
            return; // Skip entirely
        } else if (isAccessory) {
            excluded.push(product);
        } else {
            included.push(product);
        }
    });

    // Consolidate power items
    const powerKeywords = ['power', 'pixel', 'pds', 'data', 'usb', 'module', 'electrical'];
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

    // Process and enhance with catalogue
    const enhancedRegularItems = enhanceProductsWithCatalogue(regularItems);

    // Consolidate power items if needed
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

        return {
            included: [...enhancedRegularItems, consolidatedPowerItem],
            excluded
        };
    }

    return {
        included: enhancedRegularItems,
        excluded
    };
};

// Helper function for retry logic
const attemptParse = async (content: ParseContent, attempt: number): Promise<ParseResult> => {
    const textParts = content.filter((part): part is string => typeof part === 'string');
    const fileParts = content.filter((part): part is { mimeType: string; data: string; } => typeof part !== 'string');

    const combinedText = textParts.join('\n\n---\n\n');
    const requestContentParts: ({ text: string } | { inlineData: { mimeType: string; data: string; } })[] = [];

    // More flexible prompt on retry
    const enhancedPromptText = attempt > 1
        ? `${promptText}\n\nATTEMPT ${attempt}: Be VERY flexible. Include anything that looks like furniture or equipment. Extract partial codes, descriptions, anything with quantities.`
        : promptText;

    requestContentParts.push({ text: enhancedPromptText });

    if (combinedText.trim()) {
        requestContentParts.push({ text: combinedText });
    }

    fileParts.forEach(part => {
        requestContentParts.push({ inlineData: { mimeType: part.mimeType, data: part.data } });
    });

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
            temperature: attempt > 1 ? 0.5 : 0.3, // Higher temperature on retry
            topP: attempt > 1 ? 0.95 : 0.9,
            topK: 40,
        },
    });

    const jsonText = response.text?.trim() || '';
    const parsedData = JSON.parse(jsonText) as Partial<ParseResult>;

    const result: ParseResult = {
        products: [],
        details: {}
    };

    if (parsedData.products && Array.isArray(parsedData.products)) {
        const validProducts = parsedData.products.filter((item): item is ParsedProduct =>
            item &&
            typeof item.lineNumber === 'number' &&
            typeof item.productCode === 'string' &&
            typeof item.rawDescription === 'string' &&
            typeof item.cleanDescription === 'string' &&
            typeof item.quantity === 'number' &&
            item.quantity > 0 &&
            item.quantity < 1000
        );

        // Apply enhanced naming rules with catalogue matching
        const { included, excluded } = applyStandardNamingRules(validProducts);
        result.products = included;
        result.excludedProducts = excluded;
    }

    if (parsedData.details && typeof parsedData.details === 'object') {
        result.details = parsedData.details;
    }

    return result;
};

export const parseQuoteContent = async (content: ParseContent): Promise<ParseResult> => {
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await attemptParse(content, attempt);

            // If we got products, return success
            if (result.products.length > 0) {
                console.log(`✅ Found ${result.products.length} products with enhanced matching`);
                return result;
            }

            // If no products found, retry
            if (attempt < MAX_RETRIES) {
                console.log(`Attempt ${attempt} found no products, retrying with more flexibility...`);
                continue;
            }

            return result;

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < MAX_RETRIES) {
                console.log(`Parse attempt ${attempt} failed, retrying...`);
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                continue;
            }
        }
    }

    throw new Error(lastError?.message || "Failed to parse quote content.");
};