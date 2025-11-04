
import { GoogleGenAI, Type } from "@google/genai";

import { RichFurniture, LayoutIssue } from '../types';

// Initialize the Gemini AI Client only if API key is available.
let ai: GoogleGenAI | null = null;
try {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY;
  if (apiKey) {
    ai = new GoogleGenAI({ apiKey });
    // console.log('Gemini AI initialized successfully');
  } else {
    console.warn('No Gemini API key found - PDF parsing will not work');
  }
} catch (error: unknown) {
  console.warn('Gemini AI initialization failed:', error);
}

// Define the expected JSON schema for the furniture list from the AI.
// This ensures a structured and predictable response.
const furnitureSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: 'The name of the furniture item.',
      },
      width_cm: {
        type: Type.NUMBER,
        description: 'The width of the item in centimeters. Default to 50 if not found.',
      },
      depth_cm: {
        type: Type.NUMBER,
        description: 'The depth (or height) of the item in centimeters. Default to 50 if not found.',
      },
      quantity: {
        type: Type.NUMBER,
        description: 'The number of units for this item. Default to 1 if not specified.',
      },
      product_code: {
        type: Type.STRING,
        description: 'The product code or SKU. Optional.'
      },
      line_number: {
        type: Type.NUMBER,
        description: 'The line number from the source document (e.g., delivery note). Optional.'
      }
    },
    required: ["name", "width_cm", "depth_cm", "quantity"],
  },
};

/**
 * Defines the schema for AI layout analysis response.
 */
const layoutAnalysisSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        description: "The type of issue. Must be 'error' for definite problems like collisions, or 'suggestion' for advice.",
        enum: ['error', 'suggestion']
      },
      message: {
        type: Type.STRING,
        description: "A human-readable description of the problem or suggestion.",
      },
      itemIds: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING
        },
        description: "An array of IDs of the furniture items involved in this issue."
      }
    },
    required: ["type", "message", "itemIds"],
  },
};

const placementDimensionSchema = {
    type: Type.ARRAY,
    items: {
        type: Type.OBJECT,
        properties: {
            x1: { type: Type.NUMBER, description: "The x-coordinate of the line's start point (on the furniture's edge)." },
            y1: { type: Type.NUMBER, description: "The y-coordinate of the line's start point (on the furniture's edge)." },
            x2: { type: Type.NUMBER, description: "The x-coordinate of the line's end point (on the wall/reference point)." },
            y2: { type: Type.NUMBER, description: "The y-coordinate of the line's end point (on the wall/reference point)." },
            referenceType: { type: Type.STRING, description: "The type of object measured to. Must be 'Wall' or 'Pillar'." },
        },
        required: ['x1', 'y1', 'x2', 'y2', 'referenceType'],
    },
};

const rotationSchema = {
    type: Type.OBJECT,
    properties: {
        rotation: {
            type: Type.NUMBER,
            description: "The rotation angle in degrees of the primary shape in the image. Should be a multiple of 45 degrees. Default to 0."
        }
    },
    required: ["rotation"],
};


/**
 * Extracts text from a PDF file using pdf.js.
 * @param file The PDF file to process.
 * @returns A promise that resolves to the full text content of the PDF.
 */
const extractTextFromPdf = async (file: File): Promise<string> => {
  // Wait for PDF.js to be available if it's still loading
  let retries = 0;
  while (typeof window.pdfjsLib === 'undefined' && retries < 10) {
    // console.log('Waiting for PDF.js to load...');
    await new Promise(resolve => setTimeout(resolve, 500));
    retries++;
  }
  
  if (typeof window.pdfjsLib === 'undefined' || !window.pdfjsLib) {
    throw new Error("PDF library (pdf.js) is not loaded. Please refresh the page and try again.");
  }

  try {
    const arrayBuffer = await file.arrayBuffer();

    // Set worker path for PDF.js
    if (!window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const loadingTask = window.pdfjsLib!.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: { str: string }) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    
    return fullText.trim();
  } catch (error: unknown) {
    console.error('PDF extraction failed:', error);
    throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * Parses a PDF file using Gemini to extract a list of furniture items.
 * @param file The PDF file containing the product list.
 * @returns A promise that resolves to an array of parsed furniture objects.
 */
export const parseFurnitureFromPdf = async (file: File) => {
  // If AI is not available, provide helpful error message
  if (!ai) {
    console.warn('AI service not available - PDF parsing disabled');
    throw new Error("AI service is not available. Please check your API key configuration or try again later.");
  }

  try {
    const fileText = await extractTextFromPdf(file);

    if (!fileText.trim()) {
      throw new Error("Could not extract any text from the PDF. Please ensure the PDF contains readable text content.");
    }

    // console.log('Extracted text from PDF:', fileText.substring(0, 500) + '...');

    const prompt = `From the following text, extract a list of furniture items. For each item, find its name, width, depth, quantity, product code, and line number if available. IMPORTANT: Dimensions in architectural drawings are often in millimeters (mm). You MUST convert all dimensions you find to centimeters (cm) for the output JSON. Provide the output as a JSON array. If a value isn't found, use a reasonable default (e.g., 50 for dimensions, 1 for quantity) or omit optional fields. Text: \n\n${fileText}`;

    // console.log('Sending request to AI service...');

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-exp",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: furnitureSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from AI service");
    }
    
    // console.log('AI response received:', jsonText);
    
    const parsedData = JSON.parse(jsonText);
    
    if (!Array.isArray(parsedData)) {
        throw new Error("AI response was not in the expected array format.");
    }
    
    // The Gemini response uses snake_case, so we convert it to camelCase for our app
    const processedData = parsedData.map(item => ({
        ...item,
        productCode: item.product_code,
        lineNumber: item.line_number,
    }));

    // console.log('Successfully parsed', processedData.length, 'furniture items');
    return processedData;

  } catch (error: unknown) {
    console.error("PDF parsing failed:", error);
    if (error instanceof Error ? error.message : String(error).includes('PDF library')) {
      throw new Error("PDF processing is not available. Please refresh the page and try again.");
    }
    if (error instanceof Error ? error.message : String(error).includes('AI service')) {
      throw error; // Re-throw AI service errors as-is
    }
    throw new Error(`Failed to parse document: ${error instanceof Error ? error.message : String(error)}. Please ensure it's a valid product list or work order.`);
  }
};

/**
 * Analyzes the furniture layout using Gemini for potential issues.
 * @param placedFurniture An array of furniture items on the canvas.
 * @param floorPlanDimensions The dimensions of the floor plan image.
 * @returns A promise that resolves to an array of identified layout issues.
 */
export const checkLayoutWithAi = async (
  placedFurniture: RichFurniture[],
  floorPlanDimensions: { width: number; height: number }
): Promise<LayoutIssue[]> => {
  if (!ai) {
    console.warn('AI service not available - using basic collision detection');
    // Return basic collision detection without AI
    const issues: LayoutIssue[] = [];
    
    for (let i = 0; i < placedFurniture.length; i++) {
      for (let j = i + 1; j < placedFurniture.length; j++) {
        const item1 = placedFurniture[i];
        const item2 = placedFurniture[j];
        
        // Simple overlap detection
        const overlap = (
          item1.x! < item2.x! + item2.w &&
          item1.x! + item1.w > item2.x! &&
          item1.y! < item2.y! + item2.h &&
          item1.y! + item1.h > item2.y!
        );
        
        if (overlap) {
          issues.push({
            type: 'error' as const,
            message: `${item1.name} overlaps with ${item2.name}`,
            itemIds: [item1.id, item2.id]
          });
        }
      }
    }
    
    return issues;
  }

  if (placedFurniture.length === 0) {
    throw new Error("There is no furniture on the floor plan to analyze.");
  }

  // Simplify the data sent to the AI
  const simplifiedFurniture = placedFurniture.map(f => ({
    id: f.id,
    name: f.name,
    x: Math.round(f.x || 0),
    y: Math.round(f.y || 0),
    width: Math.round(f.w),
    height: Math.round(f.h),
    rotation: f.rotation,
  }));

  const prompt = `
    You are an expert interior designer and spatial planner. Your task is to analyze a furniture layout on a floor plan and identify potential issues.

    The floor plan has dimensions: ${floorPlanDimensions.width}px width and ${floorPlanDimensions.height}px height. The coordinate system's origin (0,0) is at the top-left corner.

    Here is a list of the placed furniture items with their positions (x, y) and dimensions (width, height) in pixels:
    ${JSON.stringify(simplifiedFurniture, null, 2)}

    Please analyze this layout for the following problems:
    1.  **Collisions:** Identify any two or more items that are overlapping. Be precise.
    2.  **Boundary Violations:** Check if any part of a furniture item goes outside the floor plan boundaries (0 to ${floorPlanDimensions.width}px on the x-axis, and 0 to ${floorPlanDimensions.height}px on the y-axis).
    3.  **Flow & Access (Suggestions):** Based on the layout, identify items that might be blocking potential pathways or creating cramped spaces. Frame these as 'suggestions'. For example, a chair placed too close to a desk.
    4.  **Clustering:** Point out if too many items are clustered in one area, making it feel crowded.

    Provide your findings as a JSON array that adheres to the provided schema. For each issue, specify if it's an 'error' (for collisions and boundary violations) or a 'suggestion' (for flow and other advice). Include the IDs of the involved items. If no issues are found, return an empty array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: layoutAnalysisSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from AI service");
    }
    const parsedData = JSON.parse(jsonText);

    if (!Array.isArray(parsedData)) {
      throw new Error("AI response was not in the expected array format.");
    }

    return parsedData as LayoutIssue[];
  } catch (error: unknown) {
    console.error("Gemini API request for layout analysis:", error);
    throw new Error("The AI failed to analyze the layout. Please try again.");
  }
};

/**
 * Uses Gemini Vision to find the nearest walls to a selected item for dimensioning.
 * @param base64ImageData The base64 encoded floor plan image.
 * @param mimeType The MIME type of the image.
 * @param item The selected furniture item's properties in pixels.
 * @returns A promise resolving to an array of dimension line coordinates.
 */
export const getPlacementDimensions = async (
  base64ImageData: string,
  mimeType: string,
  item: { x: number; y: number; w: number; h: number }
): Promise<Array<{ x1: number; y1: number; x2: number; y2: number; referenceType: string }>> => {
  if (!ai) {
    console.warn('AI service not available - placement dimensions disabled');
    return [];
  }
  const imagePart = {
    inlineData: {
      mimeType,
      data: base64ImageData,
    },
  };

  const prompt = `
    You are an expert computer vision assistant for an office layout tool. Your task is to analyze a floor plan image and determine the coordinates for measurement lines from a selected furniture item to the nearest **structural elements** only.

    **CRITICAL INSTRUCTIONS:**
    - You **MUST ONLY** measure to permanent structural features like **Walls** or **Pillars**.
    - You **MUST IGNORE** all other furniture items, even if they are closer. Do not measure to other desks, chairs, or cabinets.
    - Walls are typically represented by thick, solid, continuous lines. Pillars are solid filled shapes. Furniture is often shown with thinner lines.

    **INPUT:**
    1.  An image of the floor plan.
    2.  The bounding box of the selected furniture item in pixels: \`{ "x": ${Math.round(item.x)}, "y": ${Math.round(item.y)}, "width": ${Math.round(item.w)}, "height": ${Math.round(item.h)} }\`. The origin (0,0) is the top-left of the image.

    **TASK:**
    Your goal is to identify the nearest significant structural element (wall or pillar) in each of the four cardinal directions (top, bottom, left, right) from the item's bounding box.

    **For each of the four sides of the selected item:**
    1.  Project a line outwards from the center of that side.
    2.  Find the first **structural wall or pillar** that this projected line intersects.
    3.  Return the coordinates for a measurement line that starts from the item's edge and ends on that structural element.

    **OUTPUT:**
    Provide your findings as a JSON array of objects. Each object represents one measurement line and must adhere to this schema: \`{ "x1": number, "y1": number, "x2": number, "y2": number, "referenceType": string }\`.

    -   \`(x1, y1)\` must be on the edge of the selected furniture item.
    -   \`(x2, y2)\` must be on the surface of the wall/pillar you identified.
    -   \`referenceType\` must be either "Wall" or "Pillar", indicating the type of structural element you measured to.

    Only return lines for directions where a clear structural element is found. If none are found, return an empty array.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: placementDimensionSchema,
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from AI service");
    }
    const parsedData = JSON.parse(jsonText);

    if (!Array.isArray(parsedData)) {
      throw new Error("AI response was not in the expected array format.");
    }

    return parsedData as Array<{ x1: number; y1: number; x2: number; y2: number; referenceType: string }>;
  } catch (error: unknown) {
    console.error("Gemini API request for placement dimensions:", error);
    throw new Error("The AI failed to measure placement dimensions. Please try again.");
  }
};

/**
 * Uses Gemini Vision to detect the rotation of a shape in an image snippet.
 * @param base64ImageData The base64 encoded image snippet.
 * @param mimeType The MIME type of the image.
 * @returns A promise resolving to the rotation angle in degrees.
 */
export const getRotationFromImage = async (
  base64ImageData: string,
  mimeType: string,
): Promise<number> => {
  if (!ai) {
    console.warn('AI service not available - rotation detection disabled');
    return 0; // Return no rotation
  }
  const imagePart = { inlineData: { mimeType, data: base64ImageData } };

  const prompt = `
    You are a computer vision assistant. Analyze the provided image snippet from a floor plan.
    Identify the primary rectangular or straight-line shape in the center of the image.
    Determine its orientation and return the rotation angle in degrees.
    The angle should be one of [0, 45, 90, 135, 180, 225, 270, 315].
    0 degrees means horizontal, and 90 degrees means vertical.
    Provide the output as a JSON object with a single 'rotation' key.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: "application/json",
        responseSchema: rotationSchema,
        thinkingConfig: { thinkingBudget: 0 },
      },
    });

    const jsonText = response.text;
    if (!jsonText) {
      throw new Error("Empty response from AI service");
    }
    const parsedData = JSON.parse(jsonText);
    return parsedData.rotation || 0;
  } catch (error: unknown) {
    console.error("Gemini API request for rotation detection failed:", error);
    // Fail gracefully, returning 0 rotation.
    return 0;
  }
};
