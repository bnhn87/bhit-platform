// Suppliers API
import type { NextApiRequest, NextApiResponse } from 'next';

import type { APIResponse, Supplier } from '../../lib/pod/types';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<APIResponse<{ suppliers: Supplier[] }>>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const { data: { session }, error: authError } = await supabase.auth.getSession();
    if (authError || !session) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Fetch active suppliers
    const { data: suppliers, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('active', true)
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    return res.status(200).json({
      success: true,
      data: { suppliers: suppliers || [] }
    });

  } catch (error: any) {
    console.error('Suppliers fetch error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch suppliers'
    });
  }
}
