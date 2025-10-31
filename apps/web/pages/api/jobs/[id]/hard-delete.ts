import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';
import { logJobHardDeleted } from '../../../../lib/activityLogger';

/**
 * Hard Delete Job API
 * DELETE /api/jobs/[id]/hard-delete
 *
 * Permanently deletes a job from the database
 * Requires can_hard_delete_jobs permission (director/admin by default)
 */

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Job ID is required' });
    }

    // Get auth token from header
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: No auth token provided' });
    }

    // Create client with user's token for auth check
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await userClient.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check user permissions using admin client
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(user.id);

    const permissions = authUser?.user?.user_metadata?.permissions;
    const canHardDelete = permissions?.can_hard_delete_jobs === true;

    if (!canHardDelete) {
      return res.status(403).json({
        error: 'Forbidden: You do not have permission to permanently delete jobs'
      });
    }

    // Check if job exists and is already soft-deleted
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('id, reference, title, deleted_at')
      .eq('id', id)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (!job.deleted_at) {
      return res.status(400).json({
        error: 'Job must be soft-deleted first before permanent deletion'
      });
    }

    // Permanently delete the job
    const { error: deleteError } = await supabaseAdmin
      .from('jobs')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Hard delete error:', deleteError);
      return res.status(500).json({ error: deleteError.message });
    }

    // Log the hard delete in activity log
    await logJobHardDeleted(id, job.reference || job.title, user.id);

    return res.status(200).json({
      success: true,
      message: 'Job permanently deleted',
      job_id: id
    });

  } catch (error: any) {
    console.error('Hard delete API error:', error);
    return res.status(500).json({
      error: error?.message || 'Internal server error'
    });
  }
}
