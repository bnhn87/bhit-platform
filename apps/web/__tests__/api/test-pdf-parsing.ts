import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Test the API key availability
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || process.env.API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ 
        error: 'No Gemini API key found',
        checked: [
          'GEMINI_API_KEY',
          'NEXT_PUBLIC_GEMINI_API_KEY', 
          'API_KEY'
        ]
      });
    }

    // Test PDF.js availability (this will be undefined on server-side, which is expected)
    const pdfJsAvailable = typeof globalThis !== 'undefined' && 'pdfjsLib' in globalThis;

    return res.status(200).json({
      success: true,
      apiKeyAvailable: !!apiKey,
      apiKeyLength: apiKey.length,
      pdfJsAvailable,
      message: 'PDF parsing service is configured. API key is available, PDF.js will be loaded client-side.',
      instructions: 'Upload a PDF in the floor planner to test full functionality.'
    });

  } catch (error: unknown) {
    return res.status(500).json({
      error: 'Failed to check PDF parsing service',
      details: error instanceof Error ? error.message : String(error)
    });
  }
}