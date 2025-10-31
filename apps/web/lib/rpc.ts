// apps/web/lib/rpc.ts
import { supabase } from "./supabaseClient";

export async function ensureJobPin(jobId: string) {
  const { data, error } = await supabase.rpc("ensure_job_pin", { p_job: jobId });
  if (error) throw error;
  return data as string; // 4-digit PIN
}

export async function getOrCreateJobToken(jobId: string) {
  const { data, error } = await supabase.rpc("get_or_create_job_token", { p_job: jobId });
  if (error) throw error;
  return data as string; // token
}

export async function verifyGuestPin(token: string, pin: string) {
  const { data, error } = await supabase.rpc("verify_guest_pin", { token, pin });
  if (error) throw error;
  return (data ?? []) as Array<{
    id: string; title: string; client_name: string | null; status: string; created_at: string;
  }>;
}

export async function startJobWithPin(jobId: string, pin: string) {
  const { data, error } = await supabase.rpc("start_job_with_pin", { p_job: jobId, p_pin: pin });
  if (error) throw error;
  return !!data;
}
