// lib/storage.ts
import { supabase, handleSupabaseError, handleSupabaseSuccess } from "./supabaseClient";

export type StorageResult<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string | null;
  details?: Record<string, unknown>;
};

/** Validate file type and size */
export function validateFile(file: File, options?: {
  maxSizeMB?: number;
  allowedTypes?: string[];
}): { valid: boolean; error?: string } {
  const { maxSizeMB = 10, allowedTypes } = options || {};
  
  // Check file size
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return { valid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }
  
  // Check file type if specified
  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not allowed` };
  }
  
  return { valid: true };
}

/** Generate safe filename with timestamp */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^\w.\-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** path: jobs/<jobId>/drawings/<timestamp>_<filename> */
export function jobDrawingPath(jobId: string, filename: string): string {
  if (!jobId || !filename) {
    throw new Error("Job ID and filename are required");
  }
  const safe = sanitizeFilename(filename);
  const ts = Date.now();
  return `jobs/${jobId}/drawings/${ts}_${safe}`;
}

/** path: jobs/<jobId>/<type>/<timestamp>_<filename> */
export function jobAssetPath(jobId: string, filename: string, type: "drawings" | "photos" = "photos"): string {
  if (!jobId || !filename) {
    throw new Error("Job ID and filename are required");
  }
  const safe = sanitizeFilename(filename);
  const ts = Date.now();
  return `jobs/${jobId}/${type}/${ts}_${safe}`;
}

/** Upload a drawing file to the private 'job-assets' bucket */
export async function uploadJobDrawing(jobId: string, file: File): Promise<StorageResult<{ path: string }>> {
  try {
    // Validate file
    const validation = validateFile(file, {
      maxSizeMB: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    });
    
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    const path = jobDrawingPath(jobId, file.name);
    const { error } = await supabase.storage.from("job-assets").upload(path, file, {
      upsert: true,
      cacheControl: "3600",
    });
    
    if (error) {
      return handleSupabaseError(error);
    }
    
    return handleSupabaseSuccess({ path });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Upload failed';
    return { success: false, error: errorMessage, details: err as Record<string, unknown> };
  }
}

/** Get a short-lived signed URL for direct file upload */
export async function getUploadUrl(
  jobId: string, 
  file: File, 
  type: "drawings" | "photos" = "photos"
): Promise<StorageResult<{ url: string; path: string }>> {
  try {
    const path = jobAssetPath(jobId, file.name, type);
    const { data, error } = await supabase.storage.from("job-assets").createSignedUploadUrl(path);
    
    if (error) {
      return handleSupabaseError(error);
    }
    
    return handleSupabaseSuccess({ url: data.signedUrl, path });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to get upload URL';
    return { success: false, error: errorMessage, details: err as Record<string, unknown> };
  }
}

/** Delete an asset from the private 'job-assets' bucket */
export async function deleteAsset(path: string): Promise<StorageResult<{ success: boolean }>> {
  try {
    if (!path) {
      return { success: false, error: 'Path is required' };
    }
    
    const { error } = await supabase.storage.from("job-assets").remove([path]);
    
    if (error) {
      return handleSupabaseError(error);
    }
    
    return handleSupabaseSuccess({ success: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Delete failed';
    return { success: false, error: errorMessage, details: err as Record<string, unknown> };
  }
}

/** Delete a drawing file from the private 'job-assets' bucket and the database record */
export async function deleteDrawing(
  storagePath: string, 
  drawingId: string
): Promise<StorageResult<{ success: boolean }>> {
  try {
    if (!storagePath || !drawingId) {
      return { success: false, error: 'Storage path and drawing ID are required' };
    }
    
    // First delete the file from storage
    const { error: storageError } = await supabase.storage.from("job-assets").remove([storagePath]);
    
    // Then delete the database record
    const { error: dbError } = await supabase.from("job_drawings").delete().eq("id", drawingId);
    
    // Return any error that occurred
    if (storageError) {
      return handleSupabaseError(storageError);
    }
    if (dbError) {
      return handleSupabaseError(dbError);
    }
    
    return handleSupabaseSuccess({ success: true });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Delete failed';
    return { success: false, error: errorMessage, details: err as Record<string, unknown> };
  }
}

/** Get a short-lived signed URL for display */
export async function getSignedUrl(
  path: string, 
  expiresIn = 60 * 10
): Promise<StorageResult<{ url: string }>> {
  try {
    if (!path) {
      return { success: false, error: 'Path is required' };
    }
    
    const { data, error } = await supabase.storage
      .from("job-assets")
      .createSignedUrl(path, expiresIn);
      
    if (error) {
      return handleSupabaseError(error);
    }
    
    return handleSupabaseSuccess({ url: data.signedUrl });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to get signed URL';
    return { success: false, error: errorMessage, details: err as Record<string, unknown> };
  }
}
