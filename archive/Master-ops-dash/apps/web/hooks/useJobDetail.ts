// apps/web/hooks/useJobDetail.ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type JobRow = {
  id: string;
  reference: string | null;
  title: string;
  client_name: string | null;
  status: "planned" | "in_progress" | "completed" | "snagging";
  percent_complete: number | null;
  created_at: string;
};

export type TaskRow = {
  id: string;
  job_id: string;
  title: string;
  is_done: boolean;
  order_index: number;
};

export type NoteRow = {
  id: string;
  job_id: string;
  content: string;
  created_at: string;
};

export function useJobDetail(jobId: string | undefined) {
  const [job, setJob] = useState<JobRow | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [photos, setPhotos] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!jobId) return;
    setLoading(true);

    const [j, t, n, listed] = await Promise.all([
      supabase.from("jobs").select("*").eq("id", jobId).single(),
      supabase
        .from("job_tasks")
        .select("*")
        .eq("job_id", jobId)
        .order("order_index", { ascending: true }),
      supabase
        .from("job_notes")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false }),
      supabase.storage.from("job-photos").list(jobId, {
        limit: 1000,
        sortBy: { column: "name", order: "asc" }
      })
    ]);

    if (j.data) setJob(j.data as any);
    if (t.data) setTasks(t.data as any);
    if (n.data) setNotes(n.data as any);

    const files = listed.data || [];
    const urls = files.map((f) => {
      const { data } = supabase.storage.from("job-photos").getPublicUrl(`${jobId}/${f.name}`);
      return { name: f.name, url: data.publicUrl };
    });
    setPhotos(urls);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // mutations
  async function addTask(title: string) {
    if (!jobId || !title.trim()) return;
    const nextOrder = (tasks[tasks.length - 1]?.order_index || 0) + 1;
    await supabase.from("job_tasks").insert({ job_id: jobId, title: title.trim(), order_index: nextOrder });
    await refresh();
  }

  async function toggleTask(id: string, is_done: boolean) {
    await supabase.from("job_tasks").update({ is_done }).eq("id", id);
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, is_done } : t)));
  }

  async function addNote(content: string) {
    if (!jobId || !content.trim()) return;
    await supabase.from("job_notes").insert({ job_id: jobId, content: content.trim() });
    await refresh();
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || !jobId) return;
    const bucket = supabase.storage.from("job-photos");
    for (const f of Array.from(files)) {
      const path = `${jobId}/${Date.now()}-${f.name.replace(/\s+/g, "_")}`;
      await bucket.upload(path, f, { upsert: false });
    }
    await refresh();
  }

  async function deletePhoto(name: string) {
    if (!jobId) return;
    await supabase.storage.from("job-photos").remove([`${jobId}/${name}`]);
    await refresh();
  }

  return { job, tasks, notes, photos, loading, addTask, toggleTask, addNote, uploadPhotos, deletePhoto };
}
