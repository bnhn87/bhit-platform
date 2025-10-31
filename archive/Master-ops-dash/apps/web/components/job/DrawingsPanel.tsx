import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { panelStyle, theme } from "../../lib/theme";
import { uploadJobAsset, removeJobAsset, signedUrl } from "../../lib/storage";

type Drawing = {
  id: string;
  job_id: string;
  name: string;
  path: string;
  promoted: boolean;
  created_at: string;
};

export default function DrawingsPanel({ jobId }: { jobId: string }) {
  const [rows, setRows] = useState<Drawing[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const isPlanned = useMemo(
    () => true, // optional: pass job.status to gate UI; DB trigger will still enforce
    []
  );

  async function load() {
    const { data, error } = await supabase
      .from("job_drawings")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    if (error) {
      setMsg(error.message);
      return;
    }
    setRows((data as Drawing[]) || []);
  }

  useEffect(() => {
    if (jobId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function onUpload(ev: React.ChangeEvent<HTMLInputElement>) {
    const files = ev.target.files;
    if (!files || !files.length) return;
    setBusy(true);
    setMsg(null);
    try {
      for (const file of Array.from(files)) {
        const { path } = await uploadJobAsset(jobId, file, "drawings");
        const { error } = await supabase.from("job_drawings").insert({
          job_id: jobId,
          name: file.name,
          path
        });
        if (error) throw error;
      }
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Upload failed.");
    } finally {
      setBusy(false);
      ev.target.value = "";
    }
  }

  async function promote(id: string, promoted: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.from("job_drawings").update({ promoted }).eq("id", id);
      if (error) throw error;
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(d: Drawing) {
    setBusy(true);
    setMsg(null);
    try {
      const { error } = await supabase.from("job_drawings").delete().eq("id", d.id);
      if (error) throw error;
      await removeJobAsset(d.path);
      await load();
    } catch (e: any) {
      setMsg(e?.message || "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ ...panelStyle, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 600 }}>Drawings</div>
        <div style={{ flex: 1 }} />
        <label style={btnSecondary(busy || !isPlanned)}>
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.svg,.webp"
            multiple
            onChange={onUpload}
            disabled={busy || !isPlanned}
            style={{ display: "none" }}
          />
          Upload
        </label>
      </div>

      {msg && <div style={{ color: theme.colors.subtext, marginTop: 8 }}>{msg}</div>}

      {rows.length === 0 ? (
        <div style={{ color: theme.colors.subtext, marginTop: 10 }}>No drawings yet.</div>
      ) : (
        <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
          {rows.map((d) => (
            <DrawingRow key={d.id} d={d} onPromote={promote} onRemove={remove} />
          ))}
        </div>
      )}
    </div>
  );
}

function DrawingRow({
  d,
  onPromote,
  onRemove
}: {
  d: Drawing;
  onPromote: (id: string, promoted: boolean) => Promise<void>;
  onRemove: (d: Drawing) => Promise<void>;
}) {
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const u = await signedUrl(d.path, 3600);
        if (active) setUrl(u);
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [d.path]);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto auto",
        gap: 10,
        alignItems: "center",
        padding: "8px 10px",
        border: `1px solid ${theme.colors.panelBorder}`,
        borderRadius: 10
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 6, overflow: "hidden", background: "#111823", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {url ? (
          // Image preview for images, generic icon for others
          /\.(png|jpe?g|webp|svg)$/i.test(d.name) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={d.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: 11, color: theme.colors.subtext }}>FILE</span>
          )
        ) : (
          <span style={{ fontSize: 11, color: theme.colors.subtext }}>...</span>
        )}
      </div>

      <div style={{ overflow: "hidden" }}>
        <div style={{ whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{d.name}</div>
        <div style={{ fontSize: 12, color: theme.colors.subtext }}>
          {new Date(d.created_at).toLocaleString()}
        </div>
      </div>

      <a
        href={url || "#"}
        target="_blank"
        rel="noreferrer"
        style={btnSecondary(false)}
        onClick={(e) => {
          if (!url) e.preventDefault();
        }}
      >
        Open
      </a>

      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={() => onPromote(d.id, !d.promoted)}
          style={d.promoted ? btnSecondary(false) : btnPrimary()}
        >
          {d.promoted ? "Unpromote" : "Promote"}
        </button>
        <button onClick={() => onRemove(d)} style={btnSecondary(false)}>
          Delete
        </button>
      </div>
    </div>
  );
}

function btnPrimary(): React.CSSProperties {
  return {
    padding: "8px 10px",
    background: theme.colors.accent,
    color: "white",
    border: 0,
    borderRadius: 8,
    cursor: "pointer"
  };
}

function btnSecondary(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 10px",
    background: "#111823",
    border: `1px solid ${theme.colors.panelBorder}`,
    color: theme.colors.text,
    borderRadius: 8,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1
  };
}
