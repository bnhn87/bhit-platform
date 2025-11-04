import { NextApiRequest, NextApiResponse } from 'next';

import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if job_floorplans table exists
    const { data: floorPlans, error: floorPlansError } = await supabase
      .from('job_floorplans')
      .select('count', { count: 'exact' })
      .limit(1);

    // Check if generated_tasks table exists
    const { data: tasks, error: tasksError } = await supabase
      .from('generated_tasks')
      .select('count', { count: 'exact' })
      .limit(1);

    res.status(200).json({
      success: true,
      tables: {
        job_floorplans: {
          exists: !floorPlansError || floorPlansError.code !== '42P01',
          error: floorPlansError ? floorPlansError.message : null,
          count: floorPlans ? floorPlans.length : 0
        },
        generated_tasks: {
          exists: !tasksError || tasksError.code !== '42P01',
          error: tasksError ? tasksError.message : null,
          count: tasks ? tasks.length : 0
        }
      }
    });
  } catch (error: unknown) {
    console.error('Database test error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}