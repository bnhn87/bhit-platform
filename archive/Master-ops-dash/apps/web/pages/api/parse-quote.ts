// apps/web/pages/api/parse-quote.ts

import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Missing text' });
  }

  try {
    const prompt = `
      You are a quoting expert for Rawside/BH Installation & Transport.
      Extract product lines from the input and return ONLY valid JSON.

      Rules:
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

      Return ONLY JSON: { "products": [ { "productCode": "", "quantity": 0, "cleanDescription": "", "timeHoursPerUnit": 0.6 } ] }

      Input: ${text}
    `;

    const response = await openai.createChatCompletion({
      model: 'gpt-4o',
      messages: [
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
    });

    console.log('Raw OpenAI Response:', response.data.choices[0].message.content); // Log the raw response

    const content = response.data.choices[0].message.content;

    // Parse and validate
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.products)) {
      throw new Error('Invalid format');
    }

    res.status(200).json(parsed);
  } catch (error) {
    console.error('OpenAI Error:', error);
    res.status(500).json({ 
      error: 'Failed to parse', 
      details: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: true,
  },
};