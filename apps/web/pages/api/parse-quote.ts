// apps/web/pages/api/parse-quote.ts

import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

// Fallback mock parsing when API keys are not available
const mockParseQuote = (text: string) => {
  // console.log('Using fallback mock parser for text:', text.substring(0, 100) + '...');

  // Simple regex-based parsing for demonstration
  const lines = text.split('\n').filter(line => line.trim());
  const products = [];
  let _lineNumber = 1;
  let deliveryAddress = '';
  let client = '';
  let project = '';

  // Try to extract delivery address with UK postcode pattern
  const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i;
  const addressRegex = /(?:deliver|address|site|location|postcode)[:\s]*(.*?)(?:\n|$)/i;
  const clientRegex = /(?:client|customer|company)[:\s]*(.*?)(?:\n|$)/i;
  const projectRegex = /(?:project|job|reference)[:\s]*(.*?)(?:\n|$)/i;

  // Search for address and postcode
  const fullText = text;
  const addressMatch = fullText.match(addressRegex);
  if (addressMatch) {
    deliveryAddress = addressMatch[1].trim();
  }

  // If no delivery address found, try to find standalone postcode
  const postcodeMatch = fullText.match(postcodeRegex);
  if (!deliveryAddress && postcodeMatch) {
    deliveryAddress = postcodeMatch[0];
  }

  // Extract client and project
  const clientMatch = fullText.match(clientRegex);
  if (clientMatch) {
    client = clientMatch[1].trim();
  }

  const projectMatch = fullText.match(projectRegex);
  if (projectMatch) {
    project = projectMatch[1].trim();
  }

  for (const line of lines) {
    // Look for quantity patterns like "2x", "3 x", "5"
    const qtyMatch = line.match(/(\d+)\s*[x×]?\s+([A-Za-z]\w+)/i);
    if (qtyMatch) {
      const quantity = parseInt(qtyMatch[1]);
      const productCode = qtyMatch[2].toUpperCase();
      products.push({
        productCode,
        quantity,
        cleanDescription: `${productCode} (Mock Parsed)`,
      });
      _lineNumber++;
    }
  }

  // If no products found, create a sample one
  if (products.length === 0) {
    products.push({
      productCode: 'SAMPLE-ITEM',
      quantity: 1,
      cleanDescription: 'Sample Item (Demo Mode)',
    });
  }

  return {
    products,
    deliveryAddress,
    client,
    project
  };
};

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }

  // Check if API key is available
  if (!process.env.OPENAI_API_KEY || !openai) {
    // console.log('OpenAI API key not available, using fallback mock parser');
    try {
      const result = mockParseQuote(text);
      return res.status(200).json(result);
    } catch (error: unknown) {
      return res.status(500).json({
        error: 'Mock parsing failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  try {
    const prompt = `
      You are a quoting expert for Rawside/BH Installation & Transport.
      Extract quote details AND product lines from the input and return ONLY valid JSON.

      Extract these details:
      1. Delivery Address/Postcode (UK postcode format: XX## #XX)
      2. Client/Company name
      3. Project/Job reference
      4. Product lines

      Product Rules:
      - Include: lines with product code or SKU
      - Exclude: "tray", "cable tray", "access door"
      - Pedestals: include, time = 0.00
      - Power modules: group into one line at end
      - Description: "Line X – [Name] – [Dimensions]"
      - Use "D" for diameter (round tables)
      - Preserve original order and quantities

      Time Rules:
      - FLX 1P: 0.60
      - FLX 4P: 1.45
      - Bass Rectangular L2400 x W1200: 1.60
      - Tapered Bass: base + 0.25h + 0.2h per metre over 2m
      - Pedestal: 0.00
      - INFIL PANEL: 0.15
      - Power: 0.20 per unit

      If time not resolvable, use "TBC".

      Return ONLY JSON: {
        "products": [ { "productCode": "", "quantity": 0, "cleanDescription": "", "timeHoursPerUnit": 0.6 } ],
        "deliveryAddress": "",
        "client": "",
        "project": ""
      }

      Input: ${text}
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    // console.log('Raw OpenAI Response:', response.choices[0].message.content); // Log the raw response

    const content = response.choices[0].message.content;

    // Check if content is null or undefined
    if (!content) {
      throw new Error('No content returned from AI');
    }

    // Parse and validate
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.products)) {
      throw new Error('Invalid format');
    }

    res.status(200).json(parsed);
  } catch (error: unknown) {
    console.error('OpenAI Error:', error);
    res.status(500).json({
      error: 'Failed to parse',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};