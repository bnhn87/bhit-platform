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
    // console.log('🔍 Debug: Checking jobs table...');
    
    // First, test if we can select deleted_at column
    const { data: _testData, error: testError } = await supabaseServiceRole
      .from('jobs')
      .select('id, deleted_at')
      .limit(1);

    if (testError) {
      console.error('❌ Error selecting deleted_at column:', testError);
      return res.status(500).json({ 
        error: 'deleted_at column test failed', 
        details: testError.message 
      });
    }

    // Get all jobs to see what's in the database
    const { data: allJobs, error: allError } = await supabaseServiceRole
      .from('jobs')
      .select('id, title, deleted_at')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('❌ Error fetching all jobs:', allError);
      return res.status(500).json({ error: allError.message });
    }

    // Get only active jobs
    const { data: activeJobs, error: activeError } = await supabaseServiceRole
      .from('jobs')
      .select('id, title, deleted_at')
      .is('deleted_at', null);

    if (activeError) {
      console.error('❌ Error fetching active jobs:', activeError);
    }

    // Get only deleted jobs
    const { data: deletedJobs, error: deletedError } = await supabaseServiceRole
      .from('jobs')
      .select('id, title, deleted_at')
      .neq('deleted_at', null);

    if (deletedError) {
      console.error('❌ Error fetching deleted jobs:', deletedError);
    }

    // console.log('📊 Jobs summary:', {
    //   total: allJobs?.length || 0,
    //   active: activeJobs?.length || 0,
    //   deleted: deletedJobs?.length || 0
    // });

    return res.status(200).json({
      total: allJobs?.length || 0,
      active: activeJobs?.length || 0,
      deleted: deletedJobs?.length || 0,
      allJobs: allJobs?.map(j => ({
        id: j.id,
        title: j.title,
        deleted_at: j.deleted_at,
        isDeleted: !!j.deleted_at
      })) || [],
      deletedJobs: deletedJobs?.map(j => ({
        id: j.id,
        title: j.title,
        deleted_at: j.deleted_at
      })) || []
    });

  } catch (error) {
    console.error('❌ Debug jobs error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}