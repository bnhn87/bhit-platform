// lib/storage.ts
import { supabase } from "./supabaseClient";

/** path: jobs/<jobId>/drawings/<timestamp>_<filename> */
export function jobDrawingPath(jobId: string, filename: string) {
  const safe = filename.replace(/[^\w.\-]/g, "_");
  const ts = Date.now();
  return `jobs/${jobId}/drawings/${ts}_${safe}`;
}

/** Upload a drawing file to the private 'job-assets' bucket */
export async function uploadJobDrawing(jobId: string, file: File) {
  const path = jobDrawingPath(jobId, file.name);
  const { error } = await supabase.storage.from("job-assets").upload(path, file, {
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw error;
  return { path };
}

/** Get a short-lived signed URL for display */
export async function getSignedUrl(path: string, expiresIn = 60 * 10) {
  const { data, error } = await supabase.storage
    .from("job-assets")
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
