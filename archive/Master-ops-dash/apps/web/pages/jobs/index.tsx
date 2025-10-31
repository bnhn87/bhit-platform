/**
 * Jobs List — reads from public.v_jobs_list
 * Assumptions:
 * - Supabase client at @/lib/supabaseClient
 * - Neon/Glass StatusPill already present elsewhere; kept simple list here.
 * - This page only changes the data source to the new view + adds error/empty states.
 */

import React from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabaseClient";
import { theme } from '@/lib/theme';

interface Row {
  id: string;
  reference: string | null;
  title: string | null;
  client_name: string | null;
  status: string | null;
  lead_installer_name: string | null;
  created_at: string | null;
}

// Define a type for any object with name property
interface WithName {
  name: string;
}

export default function JobsPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    // Core query against the jobs table
    const { data, error } = await supabase
      .from("jobs")
      .select("id, reference, title, client_name, status, created_at, lead_installer:lead_installer_id(name)")
      .order("created_at", { ascending: false });

    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      // Transform data to match the expected structure
      const transformedData: Row[] = [];
      if (data) {
        for (const item of data) {
          const lead = item.lead_installer as unknown;
          let installerName = null;
          
          if (lead && typeof lead === 'object' && lead !== null) {
            installerName = (lead as WithName).name || null;
          }

          transformedData.push({
            id: item.id,
            reference: item.reference,
            title: item.title,
            client_name: item.client_name,
            status: item.status,
            created_at: item.created_at,
            lead_installer_name: installerName
          });
        }
      }
      setRows(transformedData);
    }
    setLoading(false);
  }

  React.useEffect(() => {
    load();
  }, []);

  const filtered = React.useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = `${r.reference ?? ""} ${r.title ?? ""} ${r.client_name ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  // Status mapping for UI display (consistent with Today page)
  const getStatusVariant = (status: string | null) => {
    if (!status) return 'info';
    switch (status) {
      case 'planned': return 'info';
      case 'in_progress': return 'ok';
      case 'installing': return 'ok';
      case 'snagging': return 'warn';
      case 'delayed': return 'warn';
      case 'on_hold': return 'warn';
      case 'completed': return 'ok';
      default: return 'info';
    }
  };

  const getStatusLabel = (status: string | null) => {
    if (!status) return '—';
    switch (status) {
      case 'planned': return 'Planned';
      case 'in_progress': return 'In Progress';
      case 'installing': return 'Installing';
      case 'snagging': return 'Snagging';
      case 'delayed': return 'Delayed';
      case 'on_hold': return 'On Hold';
      case 'completed': return 'Completed';
      default: return status;
    }
  };

  return (
    <>
      <Head>
        <title>Jobs • BHIT Work OS</title>
      </Head>

      <main style={{ padding: 24 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h1 style={{ margin: 0, color: theme.colors.text }}>Jobs</h1>
          <div style={{ display: "flex", gap: 12 }}>
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
              Today
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.panel,
                padding: "8px 12px",
                borderRadius: theme.radii.sm,
                cursor: "pointer",
                color: theme.colors.text,
              }}
            >
              Dashboard
            </button>
            <button
              onClick={load}
              style={{
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.panel,
                padding: "8px 12px",
                borderRadius: theme.radii.sm,
                cursor: "pointer",
                color: theme.colors.text,
              }}
            >
              {loading ? "Loading…" : "Reload"}
            </button>
            <Link href="/job/new" style={{
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.accent,
              padding: "8px 12px",
              borderRadius: theme.radii.sm,
              cursor: "pointer",
              color: "white",
              textDecoration: "none",
              fontWeight: "bold",
            }}>
              New Job
            </Link>
          </div>
        </header>

        <div style={{ marginBottom: 12 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search reference, title, client…"
            style={{
              width: "100%",
              background: theme.colors.panel,
              border: `1px solid ${theme.colors.border}`,
              padding: "10px 12px",
              borderRadius: theme.radii.md,
              color: theme.colors.text,
              outline: "none",
            }}
          />
        </div>

        <div
          style={{
            border: `1px solid ${theme.colors.border}`,
            borderRadius: theme.radii.md,
            overflow: "hidden",
            background: theme.colors.panel,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1.2fr 1fr 1.2fr 0.8fr",
              padding: "10px 12px",
              borderBottom: `1px solid ${theme.colors.border}`,
              fontSize: 12,
              opacity: 0.8,
              color: theme.colors.textSubtle,
            }}
          >
            <div>Reference / Title</div>
            <div>Client</div>
            <div>Status</div>
            <div>Lead installer</div>
            <div>Actions</div>
          </div>

          {/* Error state */}
          {err && (
            <div style={{ padding: 14, color: theme.colors.danger }}>
              Error: {err}
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={load}
                  style={{
                    border: `1px solid ${theme.colors.border}`,
                    background: theme.colors.panel,
                    padding: "6px 10px",
                    borderRadius: theme.radii.sm,
                    cursor: "pointer",
                    color: theme.colors.text,
                  }}
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading && !err && (
            <div style={{ padding: 14, opacity: 0.7, color: theme.colors.textSubtle }}>Loading…</div>
          )}

          {/* Empty state */}
          {!loading && !err && filtered.length === 0 && (
            <div style={{ padding: 14, opacity: 0.7, color: theme.colors.textSubtle }}>No jobs found.</div>
          )}

          {/* Rows */}
          {!loading &&
            !err &&
            filtered.map((r) => (
              <div
                key={r.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.2fr 1fr 1.2fr 0.8fr",
                  padding: "12px",
                  borderTop: `1px solid ${theme.colors.border}`,
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: theme.colors.text }}>{r.reference ?? "—"}</div>
                  <div style={{ opacity: 0.8, color: theme.colors.textSubtle }}>{r.title ?? "—"}</div>
                </div>
                <div style={{ color: theme.colors.text }}>{r.client_name ?? "—"}</div>
                <div>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "6px 10px",
                      borderRadius: 999,
                      background: theme.colors.panel,
                      border: `1px solid ${theme.colors.border}`,
                      fontSize: 12,
                      color: theme.colors.text,
                    }}
                    title={r.status ?? ""}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 6,
                        background:
                          r.status === "completed"
                            ? theme.colors.accentAlt
                            : r.status === "in_progress" || r.status === "installing"
                            ? theme.colors.accent
                            : r.status === "snagging" || r.status === "delayed" || r.status === "on_hold"
                            ? theme.colors.warn
                            : "#9aa4af",
                      }}
                    />
                    {getStatusLabel(r.status)}
                  </span>
                </div>
                <div style={{ color: theme.colors.text }}>{r.lead_installer_name ?? "—"}</div>
                <div>
                  <Link
                    href={`/job/${r.id}`}
                    style={{
                      border: `1px solid ${theme.colors.border}`,
                      background: theme.colors.panel,
                      padding: "6px 10px",
                      borderRadius: theme.radii.sm,
                      color: theme.colors.text,
                      textDecoration: "none",
                      fontWeight: "bold",
                    }}
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
        </div>
      </main>
    </>
  );
}
