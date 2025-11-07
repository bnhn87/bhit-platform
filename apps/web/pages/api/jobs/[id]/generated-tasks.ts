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

  const { id: jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  try {
    const { data, error } = await supabaseServiceRole
      .from('generated_tasks')
      .select('*')
      .eq('job_id', jobId)
      .order('install_order', { ascending: true });

    if (error) {
      console.error('Error fetching generated tasks:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }

    return res.status(200).json({ data: data || [] });
  } catch (error: unknown) {
    console.error('Generated tasks API error:', error);
    return res.status(500).json({ error: 'Failed to fetch generated tasks' });
  }
}