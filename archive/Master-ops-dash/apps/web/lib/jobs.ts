import { supabase } from "./supabaseClient";

export const JOB_STATUSES = [
  "planned",
  "in_progress",
  "snagging",
  "completed",
] as const;

export type JobStatus = typeof JOB_STATUSES[number];

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

export function nextStatus(s: JobStatus): JobStatus {
  const order: JobStatus[] = ["planned", "in_progress", "snagging", "completed"];
  const idx = order.indexOf(s);
  return order[(idx + 1) % order.length];
}

export async function updateJobStatus(jobId: string, status: JobStatus) {
  const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);
  if (error) throw error;
}
