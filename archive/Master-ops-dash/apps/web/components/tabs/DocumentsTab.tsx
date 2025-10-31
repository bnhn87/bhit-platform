import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";

type Row = {
  id: string;
  job_id: string;
  title: string;
  doc_type: string | null;
  storage_path: string;
  file_ext: string | null;
  bytes: number | null;
  created_at: string;
};

export default function DocumentsTab({ jobId, canManage }: { jobId: string; canManage: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const bucket = "job-docs";

  async function load() {
    const { data, error } = await supabase
      .from("job_documents")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    if (error) setMsg(error.message);
    setRows((data as Row[]) || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function upload(file: File) {
    setBusy(true);
    setMsg(null);
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    const path = `jobs/${jobId}/docs/${Date.now()}-${file.name}`;
    // upload
    const up = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) {
      setMsg(up.error.message);
      setBusy(false);
      return;
    }
    // insert row
    const { error } = await supabase.from("job_documents").insert({
      job_id: jobId,
      title: file.name,
      doc_type: null,
      storage_path: path,
      file_ext: ext,
      bytes: file.size
    });
    if (error) setMsg(error.message);
    setBusy(false);
    await load();
  }

  async function download(row: Row) {
    const signed = await supabase.storage.from(bucket).createSignedUrl(row.storage_path, 60 * 60);
    if (signed.error) {
      alert(signed.error.message);
      return;
    }
    window.open(signed.data.signedUrl, "_blank");
  }

  async function remove(row: Row) {
    if (!canManage) return;
    if (!confirm("Delete this document?")) return;
    setBusy(true);
    // best-effort: delete storage first; then row
    await supabase.storage.from(bucket).remove([row.storage_path]).catch(() => {});
    const { error } = await supabase.from("job_documents").delete().eq("id", row.id);
    if (error) setMsg(error.message);
    setBusy(false);
    await load();
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ fontWeight: 600 }}>Documents</div>
        <div style={{ marginLeft: "auto", color: theme.colors.subtext }}>{rows.length} file(s)</div>
        {canManage && (
          <label
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${theme.colors.panelBorder}`,
              background: theme.colors.panel,
              color: theme.colors.text,
              cursor: "pointer",
              opacity: busy ? 0.7 : 1
            }}
          >
            Upload
            <input
              type="file"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
        )}
      </div>

      <div
        style={{
          border: `1px solid ${theme.colors.panelBorder}`,
          borderRadius: 10,
          overflow: "hidden"
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0f151c", color: theme.colors.subtext }}>
              <th style={{ textAlign: "left", padding: "10px 12px" }}>Title</th>
              <th style={{ textAlign: "left", padding: "10px 12px" }}>Type</th>
              <th style={{ textAlign: "right", padding: "10px 12px" }}>Size</th>
              <th style={{ textAlign: "right", padding: "10px 12px", width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: `1px solid ${theme.colors.panelBorder}` }}>
                <td style={{ padding: "10px 12px", color: theme.colors.text }}>{r.title}</td>
                <td style={{ padding: "10px 12px", color: theme.colors.subtext }}>{r.doc_type ?? "—"}</td>
                <td style={{ padding: "10px 12px", color: theme.colors.subtext, textAlign: "right" }}>
                  {r.bytes != null ? `${Math.round(r.bytes / 1024)} KB` : "—"}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right" }}>
                  <button
                    onClick={() => download(r)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${theme.colors.panelBorder}`,
                      background: theme.colors.panel,
                      color: theme.colors.text,
                      marginRight: 8
                    }}
                  >
                    Open
                  </button>
                  {canManage && (
                    <button
                      onClick={() => remove(r)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: `1px solid ${theme.colors.panelBorder}`,
                        background: "#1a1313",
                        color: "#ffb4b4"
                      }}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 16, color: theme.colors.subtext }}>
                  No documents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {msg && (
        <div
          style={{
            padding: 10,
            borderLeft: `4px solid ${theme.colors.brand}`,
            background: "#0f151c",
            color: theme.colors.text,
            borderRadius: 8
          }}
        >
          {msg}
        </div>
      )}
    </div>
  );
}
