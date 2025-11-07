import { JobFloorPlan, InstallationTask } from '../components/floorplanner/types';

import { supabase } from './supabaseClient';


/**
 * Floor Planner Database Operations
 * Utility functions for interacting with the floor planner database tables
 */

// Get floor plan for a job
export async function getFloorPlanForJob(jobId: string): Promise<JobFloorPlan | null> {
  try {
    const { data, error } = await supabase
      .from('job_floorplans')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - this is expected for new jobs
        return null;
      }
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) return null;

    return {
      id: data.id,
      jobId: data.job_id,
      name: data.name,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      floorPlanUrl: data.floor_plan_url,
      furniture: data.furniture || [],
      scale: data.scale,
      floorPlanWidth: data.floor_plan_width,
      floorPlanHeight: data.floor_plan_height
    };
  } catch (error: unknown) {
    console.error('Error fetching floor plan:', error);
    throw error;
  }
}

// Save or update floor plan
export async function saveFloorPlan(floorPlan: JobFloorPlan): Promise<void> {
  try {
    const floorPlanToSave = {
      id: floorPlan.id,
      job_id: floorPlan.jobId,
      name: floorPlan.name,
      created_at: floorPlan.createdAt,
      updated_at: new Date().toISOString(),
      floor_plan_url: floorPlan.floorPlanUrl,
      furniture: floorPlan.furniture,
      scale: floorPlan.scale,
      floor_plan_width: floorPlan.floorPlanWidth,
      floor_plan_height: floorPlan.floorPlanHeight
    };

    const { error } = await supabase
      .from('job_floorplans')
      .upsert(floorPlanToSave, { onConflict: 'job_id' });

    if (error) {
      throw new Error(`Failed to save floor plan: ${error.message}`);
    }
  } catch (error: unknown) {
    console.error('Error saving floor plan:', error);
    throw error;
  }
}

// Get generated tasks for a job
export async function getGeneratedTasksForJob(jobId: string): Promise<InstallationTask[]> {
  try {
    const { data, error } = await supabase
      .from('generated_tasks')
      .select('*')
      .eq('job_id', jobId)
      .order('install_order', { ascending: true });

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    if (!data) return [];

    return data.map(task => ({
      id: task.id,
      jobId: task.job_id,
      title: task.title,
      description: task.description,
      installOrder: task.install_order,
      roomZone: task.room_zone,
      furnitureIds: task.furniture_ids || [],
      estimatedTimeMinutes: task.estimated_time_minutes,
      dependencies: task.dependencies || [],
      isGenerated: task.is_generated
    }));
  } catch (error: unknown) {
    console.error('Error fetching generated tasks:', error);
    throw error;
  }
}

// Save generated tasks
export async function saveGeneratedTasks(tasks: InstallationTask[]): Promise<void> {
  try {
    if (tasks.length === 0) return;

    const tasksToSave = tasks.map(task => ({
      id: task.id,
      job_id: task.jobId,
      title: task.title,
      description: task.description,
      install_order: task.installOrder,
      room_zone: task.roomZone,
      furniture_ids: task.furnitureIds,
      estimated_time_minutes: task.estimatedTimeMinutes,
      dependencies: task.dependencies,
      is_generated: task.isGenerated,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('generated_tasks')
      .upsert(tasksToSave, { onConflict: 'id' });

    if (error) {
      throw new Error(`Failed to save generated tasks: ${error.message}`);
    }
  } catch (error: unknown) {
    console.error('Error saving generated tasks:', error);
    throw error;
  }
}

// Delete floor plan
export async function deleteFloorPlan(floorPlanId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('job_floorplans')
      .delete()
      .eq('id', floorPlanId);

    if (error) {
      throw new Error(`Failed to delete floor plan: ${error.message}`);
    }
  } catch (error: unknown) {
    console.error('Error deleting floor plan:', error);
    throw error;
  }
}

// Delete generated tasks for a job
export async function deleteGeneratedTasksForJob(jobId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('generated_tasks')
      .delete()
      .eq('job_id', jobId);

    if (error) {
      throw new Error(`Failed to delete generated tasks: ${error.message}`);
    }
  } catch (error: unknown) {
    console.error('Error deleting generated tasks:', error);
    throw error;
  }
}