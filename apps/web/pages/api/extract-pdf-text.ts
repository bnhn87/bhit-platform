// AI-powered PDF text extraction API
// Integrates with SmartQuote Gemini AI service for intelligent document parsing

import type { NextApiRequest, NextApiResponse } from 'next';

import { parseQuoteContent } from '../../modules/smartquote/services/geminiService';

interface WorkOrderItem {
  productCode?: string;
  description: string;
  quantity: number;
  unitPrice?: number;
  totalPrice?: number;
  category?: string;
  notes?: string;
  room?: string;
}

// interface AIParseResult {
//   extractedText: string;
//   items: WorkOrderItem[];
//   summary?: string;
//   totalValue?: number;
//   currency?: string;
// }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, filename } = req.body;
    
    if (!content || !Array.isArray(content)) {
      return res.status(400).json({ error: 'Content array is required' });
    }


    // Use AI to parse the PDF content
    const parseResult = await parseQuoteContent(content);
    
    //   productsFound: parseResult.products?.length || 0,
    //   detailsFound: Object.keys(parseResult.details || {}).length
    // });

    // Extract work order items from AI result
    let workOrderItems: WorkOrderItem[] = [];
    let extractedText = '';
    
    if (parseResult && typeof parseResult === 'object') {
      // Handle ParseResult from SmartQuote service  
      if (parseResult.products && Array.isArray(parseResult.products)) {
        workOrderItems = parseResult.products.map((product: { productCode?: string; code?: string; cleanDescription?: string; description?: string; name?: string; quantity?: number; unitPrice?: number; price?: number; totalPrice?: number; total?: number; category?: string; notes?: string; rawDescription?: string }) => ({
          productCode: product.productCode || product.code || '',
          description: product.cleanDescription || product.description || product.name || '',
          quantity: product.quantity || 1,
          unitPrice: product.unitPrice || product.price || 0,
          totalPrice: product.totalPrice || product.total || 0,
          category: product.category || '',
          notes: product.notes || '',
          room: 'main' // Default room assignment
        }));
        
        // Try to extract text from the products for display
        extractedText = parseResult.products.map((product: { quantity?: number; productCode?: string; cleanDescription?: string; rawDescription?: string }) => 
          `${product.quantity || 1}x ${product.productCode || 'UNKNOWN'} - ${product.cleanDescription || product.rawDescription || 'Unknown Item'}`
        ).join('\n');
      } else {
        // Fallback: try to convert the result to text and parse it
        extractedText = JSON.stringify(parseResult);
        workOrderItems = parseWorkOrderItemsFromText(extractedText);
      }
    } else if (typeof parseResult === 'string') {
      extractedText = parseResult;
      workOrderItems = parseWorkOrderItemsFromText(extractedText);
    }

    const response = {
      filename: filename || 'PDF document',
      extractedText,
      items: workOrderItems,
      aiParsedContent: parseResult,
      success: true,
      message: `Successfully parsed ${workOrderItems.length} items from PDF using AI`
    };

    //   filename: filename || 'unknown',
    //   itemsFound: workOrderItems.length,
    //   textLength: extractedText.length
    // });

    res.status(200).json(response);
  } catch (error: unknown) {
    console.error('PDF AI processing error:', error);
    
    // Provide helpful error messages
    if (error instanceof Error) {
      if (error.message.includes('GEMINI_API_KEY')) {
        res.status(500).json({ 
          error: 'AI service configuration error',
          message: 'The AI parsing service is not properly configured. Please contact support.',
          success: false
        });
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        res.status(429).json({ 
          error: 'AI service temporarily unavailable',
          message: 'The AI parsing service is currently at capacity. Please try again in a few minutes.',
          success: false
        });
      } else {
        res.status(500).json({ 
          error: 'PDF processing failed',
          message: `Failed to process PDF: ${error.message}`,
          fallbackInstructions: 'You can manually copy and paste the text content from your PDF as a fallback.',
          success: false
        });
      }
    } else {
      res.status(500).json({ 
        error: 'Unknown error',
        message: 'An unexpected error occurred while processing the PDF.',
        success: false
      });
    }
  }
}

// Fallback parser for extracting items from plain text
function parseWorkOrderItemsFromText(text: string): WorkOrderItem[] {
  const items: WorkOrderItem[] = [];
  const lines = text.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Look for patterns like "2x Chair - £150" or "Product: ABC123, Qty: 5"
    const patterns = [
      /([0-9]+)\s*x?\s*([^-£$]+)\s*[-–]?\s*[£$]?([0-9.,]+)?/i,
      /qty[:\s]*([0-9]+)[^a-zA-Z]*([a-zA-Z0-9\s-]+)/i,
      /([A-Z0-9-]+)[:\s]*([^,]+),?\s*([0-9]+)/i
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        const quantity = parseInt(match[1]) || 1;
        const description = (match[2] || '').trim();
        const price = match[3] ? parseFloat(match[3].replace(/[^0-9.]/g, '')) : undefined;
        
        if (description && description.length > 2) {
          items.push({
            description,
            quantity,
            unitPrice: price,
            totalPrice: price ? price * quantity : undefined,
            room: 'main'
          });
          break;
        }
      }
    }
  }
  
  return items;
}