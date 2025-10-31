import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { panelStyle, theme } from "../../lib/theme";
import { signedUrl, uploadJobDrawing, removeJobDrawing } from "../../lib/storage";

type Row = {
  id: string;
  title: string | null;
  storage_path: string;
  content_type: string | null;
  bytes: number | null;
  is_catalogue: boolean;
  created_at: string;
  url?: string | null;
};

export default function DrawingsTab({ jobId, canManage }: { jobId: string; canManage: boolean }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    setMsg(null);
    const { data, error } = await supabase
      .from("job_drawings")
      .select("id,title,storage_path,content_type,bytes,is_catalogue,created_at")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });

    if (error) {
      setRows([]);
      setMsg(error.message);
      return;
    }
    const list = (data || []) as Row[];
    // signed URLs (best-effort)
    const withUrls = await Promise.all(
      list.map(async (r) => {
        try {
          const url = await signedUrl(r.storage_path, 3600);
          return { ...r, url };
        } catch {
          return { ...r, url: null };
        }
      })
    );
    setRows(withUrls);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function onFilesChosen(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    setMsg(null);
    try {
      for (const f of Array.from(files)) {
        await uploadJobDrawing(jobId, f);
      }
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(r: Row) {
    if (!confirm(`Delete ${r.title || r.storage_path}?`)) return;
    setBusy(true);
    setMsg(null);
    try {
      await removeJobDrawing(r.storage_path, r.id);
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function onPromote(r: Row, value: boolean) {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.from("job_drawings").update({ is_catalogue: value }).eq("id", r.id);
    setBusy(false);
    if (error) setMsg(error.message);
    else setRows((prev) => (prev ? prev.map((x) => (x.id === r.id ? { ...x, is_catalogue: value } : x)) : prev));
  }

  const isImage = (ct: string | null) => !!ct && ct.startsWith("image/");
  const isPdf = (ct: string | null) => ct === "application/pdf";

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {canManage && (
          <label
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              background: theme.colors.accent,
              color: "#fff",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            Upload drawings
            <input
              type="file"
              multiple
              accept=".png,.jpg,.jpeg,.webp,.svg,.pdf"
              onChange={(e) => onFilesChosen(e.target.files)}
              style={{ display: "none" }}
              disabled={busy}
            />
          </label>
        )}
        {msg && <div style={{ color: theme.colors.subtext }}>{msg}</div>}
      </div>

      <div
        style={{
          ...panelStyle,
          padding: 12,
          display: "grid",
          gap: 12,
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
        }}
      >
        {!rows && <div style={{ opacity: 0.7 }}>Loading…</div>}
        {rows && rows.length === 0 && <div style={{ color: theme.colors.subtext }}>No drawings yet.</div>}
        {rows &&
          rows.map((r) => (
            <div
              key={r.id}
              style={{
                border: `1px solid ${theme.colors.panelBorder}`,
                borderRadius: 10,
                overflow: "hidden",
                background: "#0f151c",
                display: "grid",
                gridTemplateRows: "160px auto",
              }}
            >
              {/* preview */}
              <div
                style={{
                  display: "grid",
                  placeItems: "center",
                  background: "#0b1117",
                  borderBottom: `1px solid ${theme.colors.panelBorder}`,
                }}
              >
                {isImage(r.content_type) && r.url ? (
                  <img
                    src={r.url}
                    alt={r.title || "drawing"}
                    style={{ maxWidth: "100%", maxHeight: 160, objectFit: "contain" }}
                  />
                ) : isPdf(r.content_type) && r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" style={{ color: theme.colors.text }}>
                    Open PDF
                  </a>
                ) : (
                  <div style={{ color: theme.colors.subtext, fontSize: 12 }}>No preview</div>
                )}
              </div>

              {/* meta + actions */}
              <div style={{ padding: 10, display: "grid", gap: 8 }}>
                <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.title || r.storage_path.split("/").pop()}
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <a
                    href={r.url || "#"}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      textDecoration: "none",
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${theme.colors.panelBorder}`,
                      color: theme.colors.text,
                      pointerEvents: r.url ? "auto" : "none",
                      opacity: r.url ? 1 : 0.5,
                    }}
                  >
                    View
                  </a>
                  {canManage && (
                    <>
                      <button
                        onClick={() => onPromote(r, !r.is_catalogue)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: `1px solid ${theme.colors.panelBorder}`,
                          background: r.is_catalogue ? theme.colors.brand : "#111823",
                          color: r.is_catalogue ? "#000" : theme.colors.text,
                          cursor: "pointer",
                        }}
                      >
                        {r.is_catalogue ? "Promoted" : "Promote"}
                      </button>
                      <button
                        onClick={() => onDelete(r)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: `1px solid ${theme.colors.panelBorder}`,
                          background: "#1a232e",
                          color: theme.colors.danger,
                          cursor: "pointer",
                        }}
                      >
                        Delete
                      </button>
                    </>
                  )}
                  <div style={{ marginLeft: "auto", color: theme.colors.subtext, fontSize: 12 }}>
                    {new Date(r.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
