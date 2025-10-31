/**
 * NotesTab — CRUD for job notes (idempotent)
 *
 * Assumptions:
 * - Table: public.job_notes (id uuid, job_id uuid, author_id uuid, body text, created_at timestamptz)
 * - RLS allows select/insert for authenticated; delete permitted to note owner or privileged roles.
 */

import React from "react";

import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/lib/theme";

type Note = {
  id: string;
  job_id: string;
  author_id: string | null;
  body: string;
  created_at: string | null;
  users?: {
    full_name: string | null;
  } | null;
};

type Props = { jobId: string };

export default function NotesTab({ jobId }: Props) {
  const [items, setItems] = React.useState<Note[]>([]);
  const [newBody, setNewBody] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [me, setMe] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setMe(u?.user?.id ?? null);
      const { data, error } = await supabase
        .from("job_notes")
        .select(`
          *,
          users:author_id (full_name)
        `)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      if (!alive) return;
      if (error) setErr(error.message);
      setItems((data as Note[]) ?? []);
    })();
    return () => {
      alive = false;
    };
  }, [jobId]);

  async function addNote() {
    const body = newBody.trim();
    if (!body) return;
    setNewBody("");
    const temp: Note = {
      id: `tmp-${crypto.randomUUID()}`,
      job_id: jobId,
      author_id: me,
      body,
      created_at: new Date().toISOString(),
    };
    setItems((s) => [temp, ...s]);
    const { data, error } = await supabase
      .from("job_notes")
      .insert({ job_id: jobId, author_id: me, body })
      .select(`
        *,
        users:author_id (full_name)
      `)
      .single();
    if (error) {
      setErr(error.message);
      setItems((s) => s.filter((n) => n.id !== temp.id));
    } else {
      setItems((s) => s.map((n) => (n.id === temp.id ? (data as Note) : n)));
    }
  }

  async function removeNote(id: string) {
    const cache = items;
    setItems((s) => s.filter((n) => n.id !== id));
    const { error } = await supabase.from("job_notes").delete().eq("id", id);
    if (error) {
      setErr(error.message);
      setItems(cache);
    }
  }

  // Get the display name for a note's author
  function getAuthorDisplayName(note: Note): string {
    if (note.users?.full_name) {
      return note.users.full_name;
    }
    if (note.author_id) {
      return "Unknown User";
    }
    return "System";
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <h3 style={{ marginTop: 0 }}>Notes</h3>

      <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
        <textarea
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          placeholder="Write a note..."
          rows={3}
          style={{
            borderRadius: 10,
            border: `1px solid ${panelBorder()}`,
            background: "rgba(255,255,255,0.04)",
            color: theme?.colors?.text ?? "#e8eef6",
            padding: 10,
            resize: "vertical",
          }}
        />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={addNote} style={primaryBtn()}>
            Add note
          </button>
        </div>
      </div>

      {err && <div style={{ color: "#ff7777", marginBottom: 8 }}>{err}</div>}

      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
        {items.map((n) => (
          <li
            key={n.id}
            style={{
              padding: 12,
              borderRadius: 10,
              border: `1px solid ${panelBorder()}`,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ opacity: 0.7, fontSize: 12 }}>
                {new Date(n.created_at ?? "").toLocaleString()}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                {getAuthorDisplayName(n)}
              </div>
            </div>
            <div style={{ whiteSpace: "pre-wrap" }}>{n.body}</div>
            {n.author_id === me && (
              <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                <button style={dangerBtn()} onClick={() => removeNote(n.id)}>
                  Delete
                </button>
              </div>
            )}
          </li>
        ))}
        {items.length === 0 && <li style={{ opacity: 0.6 }}>No notes yet.</li>}
      </ul>
    </div>
  );
}

/* ---------- styles ---------- */
function panelBorder() {
  return theme?.colors?.border ?? "rgba(255,255,255,0.08)";
}
function primaryBtn(): React.CSSProperties {
  return {
    height: 36,
    padding: "0 14px",
    borderRadius: 10,
    border: "none",
    background: theme?.colors?.accent ?? "#3b82f6",
    color: "#0c1116",
    fontWeight: 800,
  };
}
function dangerBtn(): React.CSSProperties {
  return {
    height: 30,
    padding: "0 10px",
    borderRadius: 8,
    border: `1px solid ${panelBorder()}`,
    background: "rgba(255,0,0,0.08)",
    color: "#ff9393",
    fontWeight: 800,
  };
}