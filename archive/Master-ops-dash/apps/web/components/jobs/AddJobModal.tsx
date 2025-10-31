import React, { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";

export default function AddJobModal({
  open,
  onClose,
  onCreated
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (jobId: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!open) return null;

  async function submit() {
    if (!title.trim()) {
      setMsg("Title is required.");
      return;
    }
    setBusy(true);
    setMsg(null);

    const { data, error } = await supabase
      .from("jobs")
      .insert({
        title: title.trim(),
        client_name: client.trim() || null,
        reference: ref.trim() || null,
        status: "planned",
        percent_complete: 0
      })
      .select("id")
      .single();

    if (error) {
      setMsg(error.message);
      setBusy(false);
      return;
    }

    const jobId = data!.id as string;

    // Ensure planning row exists
    await supabase
      .from("job_planning")
      .upsert({ job_id: jobId, status: "pending" }, { onConflict: "job_id" });

    setBusy(false);
    onCreated(jobId);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 520,
          maxWidth: "92vw",
          background: theme.colors.panel,
          color: theme.colors.text,
          border: `1px solid ${theme.colors.panelBorder}`,
          borderRadius: 14,
          padding: 16
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Add Job</div>
        <div style={{ display: "grid", gap: 10 }}>
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle()}
              placeholder="Project title"
            />
          </Field>
          <Field label="Client">
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              style={inputStyle()}
              placeholder="Client name"
            />
          </Field>
          <Field label="Reference">
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              style={inputStyle()}
              placeholder="Internal ref (optional)"
            />
          </Field>
        </div>
        {msg && (
          <div
            style={{
              marginTop: 10,
              padding: 8,
              borderLeft: `4px solid ${theme.colors.brand}`,
              color: theme.colors.text,
              background: "#0f151c",
              borderRadius: 8
            }}
          >
            {msg}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: `1px solid ${theme.colors.panelBorder}`,
              background: "#0f151c",
              color: theme.colors.text
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: 0,
              background: theme.colors.accent,
              color: "white",
              opacity: busy ? 0.7 : 1,
              cursor: busy ? "not-allowed" : "pointer"
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 10, alignItems: "center" }}>
      <div style={{ fontSize: 12, color: theme.colors.subtext }}>{label}</div>
      {children}
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    padding: "10px 12px",
    background: "#111823",
    border: `1px solid ${theme.colors.panelBorder}`,
    color: theme.colors.text,
    borderRadius: 8
  };
}
