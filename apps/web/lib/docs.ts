import { supabase } from "./supabaseClient";

export type JobDoc = {
  id: string;
  job_id: string;
  title: string;
  doc_type: string | null;
  storage_path: string;
  file_ext: string | null;
  bytes: number | null;
  created_at: string;
};

const BUCKET = "job-docs";

export async function listJobDocs(jobId: string) {
  const { data, error } = await supabase
    .from("job_documents")
    .select("*")
    .eq("job_id", jobId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as JobDoc[];
}

export async function uploadJobDoc(jobId: string, file: File, title?: string, docType?: string) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const ts = Date.now();
  const safe = file.name.replace(/[^\w\-.]+/g, "_");
  const path = `${jobId}/${ts}-${safe}`;

  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
    contentType: file.type || undefined,
  });
  if (upErr) throw upErr;

  const { data: ins, error: insErr } = await supabase
    .from("job_documents")
    .insert({
      job_id: jobId,
      title: title || file.name,
      doc_type: docType || "Other",
      storage_path: path,
      file_ext: ext,
      bytes: file.size,
    })
    .select()
    .single();

  if (insErr) {
    // rollback file if DB insert fails
    await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    throw insErr;
  }
  return ins as JobDoc;
}

export async function removeJobDoc(doc: JobDoc) {
  const { error: delErr } = await supabase.storage.from(BUCKET).remove([doc.storage_path]);
  if (delErr) throw delErr;
  const { error } = await supabase.from("job_documents").delete().eq("id", doc.id);
  if (error) throw error;
}

export async function getDocSignedUrl(path: string, seconds = 60 * 10) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, seconds);
  if (error) throw error;
  return data.signedUrl as string;
}
