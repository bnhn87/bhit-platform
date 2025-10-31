import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // console.log('🔍 DEBUG: Full request body:', JSON.stringify(req.body, null, 2));
  
  const { quoteData, jobDetails } = req.body;
  
  // console.log('🔍 DEBUG: quoteData structure:', {
  //   hasQuoteData: !!quoteData,
  //   quoteDataKeys: quoteData ? Object.keys(quoteData) : 'none',
  //   results: quoteData?.results ? {
  //     hasResults: true,
  //     keys: Object.keys(quoteData.results),
  //     crew: quoteData.results.crew ? Object.keys(quoteData.results.crew) : 'missing',
  //     labour: quoteData.results.labour ? Object.keys(quoteData.results.labour) : 'missing',
  //     pricing: quoteData.results.pricing ? Object.keys(quoteData.results.pricing) : 'missing'
  //   } : 'missing',
  //   products: quoteData?.products ? {
  //     hasProducts: true,
  //     count: quoteData.products.length,
  //     firstProduct: quoteData.products[0] ? Object.keys(quoteData.products[0]) : 'none'
  //   } : 'missing',
  //   details: quoteData?.details ? {
  //     hasDetails: true,
  //     keys: Object.keys(quoteData.details),
  //     customExtendedUpliftDays: quoteData.details.customExtendedUpliftDays
  //   } : 'missing'
  // });
  
  // console.log('🔍 DEBUG: jobDetails structure:', {
  //   hasJobDetails: !!jobDetails,
  //   keys: jobDetails ? Object.keys(jobDetails) : 'none',
  //   title: jobDetails?.title
  // });

  return res.status(200).json({
    success: true,
    receivedData: {
      quoteData: !!quoteData,
      jobDetails: !!jobDetails
    },
    analysis: {
      quoteDataKeys: quoteData ? Object.keys(quoteData) : [],
      resultsKeys: quoteData?.results ? Object.keys(quoteData.results) : [],
      productsCount: quoteData?.products?.length || 0,
      detailsKeys: quoteData?.details ? Object.keys(quoteData.details) : []
    }
  });
}