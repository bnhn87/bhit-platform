import { supabase, handleSupabaseError, handleSupabaseSuccess } from "./supabaseClient";
import { Job, JobPayload } from "./types";

export const JOB_STATUSES = [
  "planned",
  "in_progress",
  "snagging",
  "completed",
] as const;

export type JobStatus = typeof JOB_STATUSES[number];

export type JobResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
};

export function statusLabel(s: JobStatus): string {
  switch (s) {
    case "planned":
      return "Planned";
    case "in_progress":
      return "Installing";
    case "snagging":
      return "Snagging";
    case "completed":
      return "Completed";
    default:
      return s;
  }
}

export function getStatusColor(status: JobStatus): string {
  switch (status) {
    case "planned":
      return "bg-blue-100 text-blue-800";
    case "in_progress":
      return "bg-yellow-100 text-yellow-800";
    case "snagging":
      return "bg-orange-100 text-orange-800";
    case "completed":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function nextStatus(s: JobStatus): JobStatus {
  const order: JobStatus[] = ["planned", "in_progress", "snagging", "completed"];
  const idx = order.indexOf(s);
  return order[(idx + 1) % order.length];
}

export function previousStatus(s: JobStatus): JobStatus {
  const order: JobStatus[] = ["planned", "in_progress", "snagging", "completed"];
  const idx = order.indexOf(s);
  return order[(idx - 1 + order.length) % order.length];
}

export async function updateJobStatus(jobId: string, status: JobStatus): Promise<JobResult<Job>> {
  try {
    if (!jobId) {
      return { success: false, error: 'Job ID is required' };
    }

    if (!JOB_STATUSES.includes(status)) {
      return { success: false, error: `Invalid status: ${status}` };
    }

    const { data, error } = await supabase
      .from("jobs")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", jobId)
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to update job status';
    return { success: false, error: errorMessage, details: err };
  }
}

export async function createJob(payload: JobPayload): Promise<JobResult<Job>> {
  try {
    // Validate required fields
    if (!payload.title?.trim()) {
      return { success: false, error: 'Job title is required' };
    }

    if (!payload.created_by) {
      return { success: false, error: 'Creator ID is required' };
    }

    if (!payload.account_id) {
      return { success: false, error: 'Account ID is required' };
    }

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        ...payload,
        title: payload.title.trim(),
        status: payload.status || 'planned',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to create job';
    return { success: false, error: errorMessage, details: err };
  }
}

export async function getJob(jobId: string): Promise<JobResult<Job>> {
  try {
    if (!jobId) {
      return { success: false, error: 'Job ID is required' };
    }

    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .single();

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to get job';
    return { success: false, error: errorMessage, details: err };
  }
}

export async function getJobs(filters?: {
  status?: JobStatus;
  account_id?: string;
  limit?: number;
}): Promise<JobResult<Job[]>> {
  try {
    let query = supabase.from("jobs").select("*");

    if (filters?.status) {
      query = query.eq("status", filters.status);
    }

    if (filters?.account_id) {
      query = query.eq("account_id", filters.account_id);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      return handleSupabaseError(error);
    }

    return handleSupabaseSuccess(data || []);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to get jobs';
    return { success: false, error: errorMessage, details: err };
  }
}
