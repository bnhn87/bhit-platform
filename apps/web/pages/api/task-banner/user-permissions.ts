// API Route: User Banner Permissions
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { UpdateUserPermissionRequest } from '@/lib/taskBanner/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return handleGet(req, res);
  } else if (req.method === 'PUT') {
    return handlePut(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

// GET: Get current user's banner permission
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user permission
    const { data: permission } = await (supabaseAdmin
      .from('user_banner_permissions') as any)
      .select('*')
      .eq('user_id', user.id)
      .single();

    const enabled = permission?.banner_enabled || false;

    return res.status(200).json({ success: true, enabled, permission });
  } catch (error) {
    console.error('Error in GET /api/task-banner/user-permissions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// PUT: Update user permission (admin only)
async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin/director
    const { data: profile } = await (supabaseAdmin
      .from('profiles') as any)
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['director', 'admin'].includes(profile.role)) {
      return res.status(403).json({ error: 'Forbidden - Admin only' });
    }

    const { user_id, banner_enabled }: UpdateUserPermissionRequest = req.body;

    if (!user_id || banner_enabled === undefined) {
      return res.status(400).json({ error: 'user_id and banner_enabled required' });
    }

    // Upsert permission
    const { data: permission, error } = await (supabaseAdmin
      .from('user_banner_permissions') as any)
      .upsert({
        user_id,
        banner_enabled
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating user permission:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true, permission });
  } catch (error) {
    console.error('Error in PUT /api/task-banner/user-permissions:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
