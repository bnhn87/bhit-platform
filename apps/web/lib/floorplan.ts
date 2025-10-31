// apps/web/lib/floorplan.ts
import { supabase } from "./supabaseClient";

export function planAssetPath(jobId: string, filename: string) {
  const clean = filename.replace(/\s+/g, "-").toLowerCase();
  return `jobs/${jobId}/plans/${Date.now()}-${clean}`;
}

export function completionPhotoPath(jobId: string, filename: string) {
  const clean = filename.replace(/\s+/g, "-").toLowerCase();
  return `jobs/${jobId}/components/${Date.now()}-${clean}`;
}

export async function uploadToBucket(bucket: "job-assets" | "job-photos", path: string, file: File) {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false
  });
  if (error) throw error;
  return data;
}

export async function getFloorPlanSignedUrl(bucket: "job-assets" | "job-photos", path: string, expiresSec = 3600) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresSec);
  if (error) throw error;
  return data.signedUrl;
}
