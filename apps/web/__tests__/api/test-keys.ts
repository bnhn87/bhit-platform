// Test API keys endpoint
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const keys = {
    openai: !!process.env.OPENAI_API_KEY,
    openai_length: process.env.OPENAI_API_KEY?.length || 0,
    gemini: !!process.env.GEMINI_API_KEY,
    gemini_length: process.env.GEMINI_API_KEY?.length || 0,
    api_key: !!process.env.API_KEY,
    api_key_length: process.env.API_KEY?.length || 0,
  };

  res.status(200).json(keys);
}