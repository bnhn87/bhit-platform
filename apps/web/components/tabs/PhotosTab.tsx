/**
 * PhotosTab — private bucket upload + list with signed URLs (idempotent)
 *
 * Assumptions:
 * - Storage bucket: "job-photos" (private)
 * - Table: public.job_photos (id uuid, job_id uuid, author_id uuid, storage_path text, caption text, created_at timestamptz)
 * - RLS: authenticated users may select their account's job_photos and insert for job_id; delete own rows.
 */

import Image from "next/image";
import React from "react";

import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/lib/theme";

type Photo = {
  id: string;
  job_id: string;
  author_id: string | null;
  storage_path: string;
  caption: string | null;
  created_at: string | null;
};

type Props = { jobId: string };

export default function PhotosTab({ jobId }: Props) {
  const [items, setItems] = React.useState<Photo[]>([]);
  const [urls, setUrls] = React.useState<Record<string, string>>({});
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [me, setMe] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setMe(u?.user?.id ?? null);
      const { data, error } = await supabase
        .from("job_photos")
        .select("*")
        .eq("job_id", jobId)
        .order("created_at", { ascending: false });
      if (!alive) return;
      if (error) setErr(error.message);
      setItems((data as Photo[]) ?? []);
    })();
    return () => {
      alive = false;
    };
  }, [jobId]);

  // Resolve signed URLs on demand
  async function _ensureUrl(path: string) {
    if (urls[path]) return;
    const { data, error } = await supabase.storage.from("job-photos").createSignedUrl(path, 3600);
    if (error) {
      // Error occurred
      return;
    }
    setUrls((m) => ({ ...m, [path]: data.signedUrl }));
  }

  async function onFilesSelected(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setErr(null);

    for (const file of Array.from(files)) {
      const key = `${jobId}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("job-photos").upload(key, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (upErr) {
        setErr(upErr.message);
        continue;
      }
      const { data, error: insErr } = await supabase
        .from("job_photos")
        .insert({ job_id: jobId, author_id: me, storage_path: key, caption: file.name })
        .select("*")
        .single();
      if (!insErr && data) {
        setItems((s) => [data as Photo, ...s]);
      }
    }
    setBusy(false);
  }

  async function removePhoto(id: string, path: string) {
    const cache = items;
    setItems((s) => s.filter((p) => p.id !== id));
    const { error: delRowErr } = await supabase.from("job_photos").delete().eq("id", id);
    const { error: delObjErr } = await supabase.storage.from("job-photos").remove([path]);
    if (delRowErr || delObjErr) {
      setErr((delRowErr || delObjErr)?.message ?? "Delete failed");
      setItems(cache);
    }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <h3 style={{ marginTop: 0 }}>Photos</h3>

      {/* Uploader */}
      <div
        style={{
          padding: 12,
          borderRadius: 10,
          border: `1px solid ${panelBorder()}`,
          background: "rgba(255,255,255,0.03)",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => onFilesSelected(e.currentTarget.files)}
          disabled={busy}
        />
        <span style={{ opacity: 0.7, fontSize: 12 }}>{busy ? "Uploading..." : "JPG/PNG, multiple allowed"}</span>
      </div>

      {err && <div style={{ color: "#ff7777", marginBottom: 8 }}>{err}</div>}

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {items.map((p) => (
          <figure
            key={p.id}
            style={{
              margin: 0,
              borderRadius: 12,
              overflow: "hidden",
              border: `1px solid ${panelBorder()}`,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            {urls[p.storage_path] ? (
              <Image
                alt={p.caption ?? "photo"}
                src={urls[p.storage_path]}
                width={160}
                height={140}
                style={{ width: "100%", height: 140, objectFit: "cover", display: "block", background: "#0d0f12" }}
              />
            ) : (
              <div style={{ width: "100%", height: 140, background: "#0d0f12", display: "flex", alignItems: "center", justifyContent: "center" }}>
                Loading...
              </div>
            )}
            <figcaption style={{ padding: "6px 8px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, opacity: 0.9, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {p.caption ?? "—"}
              </span>
              {p.author_id === me && (
                <button style={dangerBtn()} onClick={() => removePhoto(p.id, p.storage_path)}>
                  Delete
                </button>
              )}
            </figcaption>
          </figure>
        ))}
      </div>

      {items.length === 0 && <div style={{ opacity: 0.6, marginTop: 8 }}>No photos yet.</div>}
    </div>
  );
}

/* ---------- styles ---------- */
function panelBorder() {
  return theme?.colors?.border ?? "rgba(255,255,255,0.08)";
}
function dangerBtn(): React.CSSProperties {
  return {
    height: 28,
    padding: "0 10px",
    borderRadius: 8,
    border: `1px solid ${panelBorder()}`,
    background: "rgba(255,0,0,0.08)",
    color: "#ff9393",
    fontWeight: 800,
  };
}
