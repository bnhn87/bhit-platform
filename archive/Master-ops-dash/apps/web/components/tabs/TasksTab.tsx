/**
 * TasksTab (hardened)
 * - No hard dependency on tasks.created_at.
 * - Selects "*" to avoid errors if optional columns are missing.
 * - Orders by sort_order only (server). Client displays gracefully.
 */

import React from "react";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/lib/theme";

type Task = {
  id: string;
  job_id: string;
  title: string;
  is_done: boolean;
  sort_order: number | null;
  // Optional — may not exist in older DBs; never required.
  created_at?: string | null;
};

export default function TasksTab({ jobId }: { jobId: string }) {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [newTitle, setNewTitle] = React.useState("");

  async function load() {
    setLoading(true);
    setErr(null);
    // Select "*" to be resilient to schema differences
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("job_id", jobId)
      .order("sort_order", { ascending: true, nullsFirst: true });
    if (error) {
      setErr(error.message);
      setTasks([]);
    } else {
      setTasks((data as Task[]) || []);
    }
    setLoading(false);
  }

  React.useEffect(() => {
    if (jobId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setErr(null);

    // Compute next sort_order
    const nextOrder =
      tasks.reduce<number>((m, t) => (t.sort_order ?? 0) > m ? (t.sort_order ?? 0) : m, 0) + 1;

    const { error } = await supabase
      .from("tasks")
      .insert({ job_id: jobId, title: newTitle.trim(), sort_order: nextOrder, is_done: false });

    if (error) {
      setErr(error.message);
      return;
    }
    setNewTitle("");
    await load();
  }

  async function toggleDone(task: Task) {
    setErr(null);
    const { error } = await supabase
      .from("tasks")
      .update({ is_done: !task.is_done })
      .eq("id", task.id);
    if (error) {
      setErr(error.message);
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, is_done: !t.is_done } : t)));
  }

  async function deleteTask(task: Task) {
    setErr(null);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      setErr(error.message);
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  }

  return (
    <div>
      {err && (
        <div style={{ color: "#ff8a8a", marginBottom: 10 }}>
          {err}
        </div>
      )}

      <form onSubmit={addTask} style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input
          placeholder="Add a task…"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          style={{
            flex: 1,
            height: 36,
            padding: "0 10px",
            borderRadius: 10,
            border: `1px solid ${theme?.colors?.panelBorder ?? "rgba(255,255,255,0.12)"}`,
            background: "rgba(0,0,0,0.35)",
            color: theme?.colors?.text ?? "#e8eef6",
          }}
        />
        <button
          type="submit"
          style={{
            height: 36,
            padding: "0 14px",
            borderRadius: 10,
            border: "none",
            background: theme?.colors?.accent ?? "#3b82f6",
            color: "#0c1116",
            fontWeight: 900,
          }}
        >
          Add
        </button>
      </form>

      {loading ? (
        <div style={{ opacity: 0.7 }}>Loading…</div>
      ) : tasks.length === 0 ? (
        <div style={{ opacity: 0.7 }}>No tasks yet.</div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
          {tasks.map((t) => (
            <li
              key={t.id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: 10,
                border: `1px solid ${theme?.colors?.panelBorder ?? "rgba(255,255,255,0.08)"}`,
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <input
                type="checkbox"
                checked={!!t.is_done}
                onChange={() => toggleDone(t)}
                style={{ width: 18, height: 18 }}
              />
              <div style={{ opacity: t.is_done ? 0.6 : 1, textDecoration: t.is_done ? "line-through" : "none" }}>
                {t.title}
              </div>
              <button
                onClick={() => deleteTask(t)}
                style={{
                  height: 30,
                  padding: "0 10px",
                  borderRadius: 8,
                  border: `1px solid ${theme?.colors?.panelBorder ?? "rgba(255,255,255,0.12)"}`,
                  background: "rgba(255,255,255,0.05)",
                  color: theme?.colors?.text ?? "#e8eef6",
                  fontWeight: 800,
                }}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
