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

  const { jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  try {
    // console.log(`🔧 DEBUG: Testing task generation for job: ${jobId}`);

    // Test 1: Check if tables exist
    // console.log('📋 Test 1: Checking if generated_tasks table exists...');
    const { data: _tasksCheck, error: tasksError } = await supabaseServiceRole
      .from('generated_tasks')
      .select('id')
      .limit(1);

    if (tasksError) {
      console.error('❌ generated_tasks table error:', tasksError);
      return res.status(500).json({ 
        error: 'generated_tasks table not available', 
        details: tasksError.message,
        hint: 'Run the SQL script from create-tables.sql to create required tables'
      });
    }

    // console.log('✅ generated_tasks table exists');

    // Test 2: Check if job_floorplans table exists (optional)
    // console.log('📋 Test 2: Checking if job_floorplans table exists (optional)...');
    const { data: _floorplansCheck, error: floorplansError } = await supabaseServiceRole
      .from('job_floorplans')
      .select('id')
      .limit(1);

    if (floorplansError) {
      // console.log('⚠️  job_floorplans table not available (optional):', floorplansError.message);
    } else {
      // console.log('✅ job_floorplans table exists');
    }

    // Test 3: Check if job exists and has product data
    // console.log('📋 Test 3: Checking job data...');
    const { data: jobData, error: jobError } = await supabaseServiceRole
      .from('jobs')
      .select('id, title, products, quote_details, labour_summary')
      .eq('id', jobId)
      .single();

    if (jobError || !jobData) {
      console.error('❌ Job not found:', jobError?.message);
      return res.status(404).json({ 
        error: 'Job not found',
        details: jobError?.message 
      });
    }

    // console.log('✅ Job found:', {
    //   id: jobData.id,
    //   title: jobData.title,
    //   hasProducts: Array.isArray(jobData.products),
    //   productsCount: Array.isArray(jobData.products) ? jobData.products.length : 0,
    //   hasQuoteDetails: !!jobData.quote_details,
    //   hasLabourSummary: !!jobData.labour_summary
    // });

    // Test 4: Create a simple test task
    // console.log('📋 Test 4: Creating test task...');
    const testTask = {
      job_id: jobId,
      title: 'Test Task - SmartQuote Integration',
      description: 'This is a test task created to verify the task generation system is working.',
      install_order: 1,
      room_zone: 'Test Room',
      furniture_ids: [],
      estimated_time_minutes: 30,
      dependencies: [],
      is_generated: true,
      status: 'Uplift',
      completed_qty: 0,
      total_qty: 1,
      missing_notes: null
    };

    const { data: _insertedTask, error: insertError } = await supabaseServiceRole
      .from('generated_tasks')
      .insert([testTask])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Failed to create test task:', insertError);
      return res.status(500).json({ 
        error: 'Failed to create test task',
        details: insertError.message 
      });
    }

    // console.log('✅ Test task created successfully:', insertedTask);

    // Test 5: Retrieve all tasks for this job
    // console.log('📋 Test 5: Retrieving all tasks for job...');
    const { data: allTasks, error: retrieveError } = await supabaseServiceRole
      .from('generated_tasks')
      .select('*')
      .eq('job_id', jobId)
      .order('install_order', { ascending: true });

    if (retrieveError) {
      console.error('❌ Failed to retrieve tasks:', retrieveError);
      return res.status(500).json({ 
        error: 'Failed to retrieve tasks',
        details: retrieveError.message 
      });
    }

    // console.log(`✅ Retrieved ${allTasks?.length || 0} tasks`);

    return res.status(200).json({
      success: true,
      tests: {
        tasksTableExists: true,
        floorplansTableExists: !floorplansError,
        jobExists: true,
        jobHasProducts: Array.isArray(jobData.products),
        testTaskCreated: true,
        totalTasks: allTasks?.length || 0
      },
      jobData: {
        id: jobData.id,
        title: jobData.title,
        productsCount: Array.isArray(jobData.products) ? jobData.products.length : 0
      },
      tasks: allTasks
    });

  } catch (error: unknown) {
    console.error('❌ DEBUG TEST ERROR:', error);
    return res.status(500).json({ 
      error: 'Debug test failed',
      details: error instanceof Error ? error.message : String(error) 
    });
  }
}