import type { NextApiRequest, NextApiResponse } from 'next';
import { PODService } from '../../../../lib/pod/pod.service';
import { supabase } from '../../../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  try {
    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const result = await PODService.getById(id as string);
      return res.status(200).json({ success: true, ...result });
    }

    if (req.method === 'PATCH') {
      const updated = await PODService.update(id as string, req.body);
      return res.status(200).json({ success: true, pod: updated });
    }

    if (req.method === 'DELETE') {
      await PODService.delete(id as string, session.user.id);
      return res.status(200).json({ success: true, message: 'POD deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: unknown) {
    console.error('POD detail API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      error: errorMessage || 'Operation failed'
    });
  }
}
