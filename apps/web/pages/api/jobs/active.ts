import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabaseServiceRole
      .from("jobs")
      .select("id, reference, title, client_name, status, created_at, deleted_at")
      .is('deleted_at', null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error('Error fetching active jobs:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ data });
  } catch (error) {
    console.error('Active jobs API error:', error);
    return res.status(500).json({ error: 'Failed to fetch active jobs' });
  }
}