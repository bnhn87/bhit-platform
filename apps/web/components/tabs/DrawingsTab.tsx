import React, { useEffect, useState } from "react";

import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";

type Row = { id: string; job_id: string; path: string; created_at: string };

export default function DrawingsTab({
  jobId,
  canManage,
}: {
  jobId: string;
  canManage: boolean;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("job_drawings")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    if (error) setMsg(error.message);
    else setRows((data || []) as Row[]);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      const path = `jobs/${jobId}/drawings/${Date.now()}_${file.name}`;
      const up = await supabase.storage
        .from("job-assets")
        .upload(path, file, {
          upsert: true,
          contentType: file.type || undefined,
        });
      if (up.error) throw up.error;

      const ins = await supabase
        .from("job_drawings")
        .insert({ job_id: jobId, path });
      if (ins.error) throw ins.error;

      setFile(null);
      await load();
    } catch (e: unknown) {
      setMsg((e as Error).message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove(row: Row) {
    if (!canManage) return;
    setBusy(true);
    setMsg(null);
    try {
      const rm = await supabase.storage.from("job-assets").remove([row.path]);
      if (rm.error) throw rm.error;
      const del = await supabase
        .from("job_drawings")
        .delete()
        .eq("id", row.id);
      if (del.error) throw del.error;
      await load();
    } catch (e: unknown) {
      setMsg((e as Error).message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function getSignedUrl(path: string) {
    const res = await supabase.storage
      .from("job-assets")
      .createSignedUrl(path, 60);
    return res.data?.signedUrl || "#";
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {canManage && (
        <div
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: 8,
            background: "#0f151c",
            padding: 12,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={busy}
          />
          <button
            onClick={upload}
            disabled={!file || busy}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.accent,
              color: "white",
              cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Uploading..." : "Upload Drawing"}
          </button>
        </div>
      )}

      {msg && (
        <div
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: 8,
            background: "#0f151c",
            padding: 12,
            borderLeft: `4px solid ${theme.colors.accent}`,
          }}
        >
          {msg}
        </div>
      )}

      <div style={{ padding: 12 }}>
        {rows.length === 0 ? (
          <div style={{ color: theme.colors.textSubtle }}>No drawings yet.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {rows.map((r) => (
              <DrawingRow
                key={r.id}
                row={r}
                canManage={canManage}
                onDelete={() => remove(r)}
                getUrl={() => getSignedUrl(r.path)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DrawingRow({
  row,
  canManage,
  onDelete,
  getUrl,
}: {
  row: Row;
  canManage: boolean;
  onDelete: () => void;
  getUrl: () => Promise<string>;
}) {
  const [href, setHref] = useState<string>("#");
  useEffect(() => {
    let ok = true;
    getUrl().then((u) => ok && setHref(u));
    return () => {
      ok = false;
    };
  }, [getUrl]);
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <div>
        <div style={{ fontWeight: 500 }}>{row.path.split("/").pop()}</div>
        <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
          {new Date(row.created_at).toLocaleString()}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: `1px solid ${theme.colors.border}`,
            background: "#0f151c",
            color: theme.colors.text,
            textDecoration: "none",
          }}
        >
          Open
        </a>
        {canManage && (
          <button
            onClick={onDelete}
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              border: `1px solid ${theme.colors.border}`,
              background: "#5a1f1f",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
