/**
 * Job Detail — header + StatusPill wired to real data from Supabase.
 * Reads public.jobs for header (reference/title/client),
 * reads/writes status directly to public.jobs by id.
 */

import React from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/lib/theme";
import StatusPill, { JobStatus } from "@/components/ui/StatusPill";

type HeaderRow = {
  id: string;
  reference: string | null;
  title: string | null;
  client_name: string | null;
  status: JobStatus;
};

export default function JobDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };

  const [row, setRow] = React.useState<HeaderRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  async function load() {
    if (!id) return;
    setLoading(true);
    setErr(null);
    // Header from jobs table
    const { data, error } = await supabase
      .from("jobs")
      .select("id, reference, title, client_name, status")
      .eq("id", id)
      .limit(1)
      .maybeSingle();

    if (error) {
      setErr(error.message);
      setRow(null);
    } else {
      // Fallback cast: status may be null/legacy → default to 'planned'
      const status = (data?.status ?? "planned") as JobStatus;
      setRow(data ? { ...data, status } : null);
    }
    setLoading(false);
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateJobStatus(next: JobStatus) {
    if (!row) return;
    // Write to base table; RLS must permit update for current user in your setup.
    const { error } = await supabase
      .from("jobs")
      .update({ status: next })
      .eq("id", row.id);
    if (error) {
      setErr(error.message);
      return;
    }
    setRow({ ...row, status: next });
  }

  return (
    <>
      <Head>
        <title>{row ? `Job ${row.reference} • BHIT Work OS` : "Job • BHIT Work OS"}</title>
      </Head>

      <main style={{ padding: 16 }}>
        {err && (
          <div style={{ marginBottom: 12, color: theme.colors.danger }}>
            Error: {err} <button onClick={load} style={{ border: `1px solid ${theme.colors.border}`, background: theme.colors.panel, padding: "4px 8px", borderRadius: theme.radii.sm, cursor: "pointer", color: theme.colors.text }}>Retry</button>
          </div>
        )}

        {loading && <div style={{ color: theme.colors.textSubtle }}>Loading…</div>}

        {!loading && row && (
          <>
            {/* Header */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: 12,
                maxWidth: 1200,
                margin: "0 auto",
                padding: "12px 16px",
                borderRadius: theme.radii.lg,
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.panel,
              }}
            >
              <div>
                <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 4 }}>Reference</div>
                <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.2 }}>
                  {row.reference ?? "—"} — {row.title ?? "—"}
                  <span style={{ opacity: 0.65 }}> • {row.client_name ?? "—"}</span>
                </h1>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button 
                  onClick={() => router.push('/today')}
                  style={{
                    border: `1px solid ${theme.colors.border}`,
                    background: theme.colors.panel,
                    padding: "8px 12px",
                    borderRadius: theme.radii.sm,
                    cursor: "pointer",
                    color: theme.colors.text,
                  }}
                >
                  Back to Today
                </button>
                <button 
                  onClick={() => router.push('/jobs')}
                  style={{
                    border: `1px solid ${theme.colors.border}`,
                    background: theme.colors.panel,
                    padding: "8px 12px",
                    borderRadius: theme.radii.sm,
                    cursor: "pointer",
                    color: theme.colors.text,
                  }}
                >
                  All Jobs
                </button>
                <StatusPill
                  value={row.status}
                  onChange={updateJobStatus}
                  title="Click to advance · Alt/Ctrl/Cmd + Click to revert"
                />
              </div>
            </section>

            {/* Tabs placeholder — keep your existing tabs below */}
            <section style={{ maxWidth: 1200, margin: "16px auto", opacity: 0.85 }}>
              Tabs go here: Tasks • Notes • Photos • Overview • Floor Plan • Documents • Products.
            </section>
          </>
        )}
      </main>
    </>
  );
}
