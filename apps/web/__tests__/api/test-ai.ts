import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // We now import the library dynamically inside the function
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = "What is the capital of France?";
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.status(200).json({ response: text });
  } catch (error: unknown) {
    console.error("AI Test Error:", error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}