// apps/web/pages/api/save-quote.ts
import { NextApiRequest, NextApiResponse } from 'next';

import { supabase } from '../../lib/supabaseClient';
import { requireAuth } from '../../lib/apiAuth';
import { validateRequestBody, QuoteSchema } from '../../lib/apiValidation';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Require authentication
  const user = await requireAuth(req, res);
  if (!user) {
    return; // requireAuth already sent 401 response
  }

  // Validate request body
  const validatedData = validateRequestBody(QuoteSchema, req, res);
  if (!validatedData) {
    return; // validateRequestBody already sent 400 response
  }

  // Insert quote with user association
  const { error } = await supabase
    .from('quotes')
    .insert({
      products: validatedData.products,
      client_id: validatedData.client_id,
      created_by: user.id,
      created_at: new Date().toISOString(),
    });

  if (error) {
    console.error('[save-quote] Database error:', error);
    return res.status(500).json({ error: 'Failed to save quote', details: error.message });
  }

  res.status(200).json({ success: true });
}