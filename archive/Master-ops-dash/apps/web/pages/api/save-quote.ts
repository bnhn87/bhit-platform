// apps/web/pages/api/save-quote.ts
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { products } = req.body;

  const { error } = await supabase
    .from('quotes')
    .insert({ products, created_at: new Date().toISOString() });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ success: true });
}