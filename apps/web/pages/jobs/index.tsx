/**
 * Jobs List — reads from public.jobs
 * Assumptions:
 * - Supabase client at @/lib/supabaseClient
 * - Neon/Glass StatusPill already present elsewhere; kept simple list here.
 * - This page only changes the data source to the new view + adds error/empty states.
 */

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import React from "react";

import StatusPill, { JobStatus } from "../../components/jobs/StatusPill";
import { supabase as _supabase } from "../../lib/supabaseClient";
import { theme } from '../../lib/theme';

interface Row {
  id: string;
  reference: string | null;
  title: string | null;
  client_name: string | null;
  status: string | null;
  // Note: lead_installer_name is not available in the base jobs table
  created_at: string | null;
}

export default function JobsPage() {
  const router = useRouter();
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [q, setQ] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'active' | 'completed'>('active');

  async function load() {
    setLoading(true);
    setErr(null);

    const endpoint = activeTab === 'active' ? '/api/jobs/active' : '/api/jobs/completed';

    try {
      const response = await fetch(endpoint);
      const result = await response.json();

      if (!response.ok) {
        setErr(result.error || 'Failed to load jobs');
        setRows([]);
      } else {
        setRows(result.data ?? []);
      }
    } catch {
      setErr('Network error - please try again');
      setRows([]);
    }

    setLoading(false);
  }

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const filtered = React.useMemo(() => {
    if (!rows) return [];
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => {
      const hay = `${r.reference ?? ""} ${r.title ?? ""} ${r.client_name ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [rows, q]);

  // Status mapping for UI display
  const getStatusVariant = (status: string | null): JobStatus => {
    if (!status) return 'planned';
    switch (status) {
      case 'planned': return 'planned';
      case 'in_progress': return 'in_progress';
      case 'installing': return 'in_progress';
      case 'snagging': return 'snagging';
      case 'completed': return 'completed';
      default: return 'planned';
    }
  };


  return (
    <>
      <Head>
        <title>Jobs • BHIT Work OS</title>
      </Head>

      <div style={{ padding: 24 }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h1 style={{ margin: 0, color: theme.colors.text }}>Jobs</h1>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={() => router.push('/today')}
              className="glassmorphic-button glassmorphic-base"
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                border: "none"
              }}
            >
              Today
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="glassmorphic-button glassmorphic-base"
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                border: "none"
              }}
            >
              Dashboard
            </button>
            <button
              onClick={load}
              className="glassmorphic-button glassmorphic-base"
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                border: "none"
              }}
            >
              {loading ? "Loading…" : "Reload"}
            </button>
            <Link href="/job/new">
              <button
                className="glassmorphic-button glassmorphic-base glassmorphic-glow-green"
                style={{
                  padding: "8px 12px",
                  cursor: "pointer",
                  border: "none"
                }}
              >
                + New Job
              </button>
            </Link>
          </div>
        </header>

        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              onClick={() => setActiveTab('active')}
              className={`glassmorphic-button glassmorphic-base ${activeTab === 'active' ? 'glassmorphic-glow-cyan' : ''}`}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                border: "none",
                background: activeTab === 'active' ? 'rgba(6, 182, 212, 0.1)' : 'transparent'
              }}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`glassmorphic-button glassmorphic-base ${activeTab === 'completed' ? 'glassmorphic-glow-green' : ''}`}
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                border: "none",
                background: activeTab === 'completed' ? 'rgba(34, 197, 94, 0.1)' : 'transparent'
              }}
            >
              Completed
            </button>
            <button
              onClick={() => router.push('/jobs/deleted')}
              className="glassmorphic-button glassmorphic-base"
              style={{
                padding: "8px 16px",
                cursor: "pointer",
                border: "none"
              }}
            >
              Deleted Jobs
            </button>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search reference, title, client…"
            className="glassmorphic-dropdown glassmorphic-base"
            style={{
              width: "100%",
              padding: "10px 12px",
              color: theme.colors.text,
              outline: "none",
              border: "none",
            }}
          />
        </div>

        <div
          className="glassmorphic-panel glassmorphic-base"
          style={{
            overflow: "hidden",
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
              color: theme.colors.text,
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
            <div style={{ padding: 14, opacity: 0.7, color: theme.colors.text }}>Loading…</div>
          )}

          {/* Empty state */}
          {!loading && !err && filtered.length === 0 && (
            <div style={{ padding: 14, opacity: 0.7, color: theme.colors.text }}>
              {activeTab === 'active' ? 'No active jobs found.' : 'No completed jobs found.'}
            </div>
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
                  <StatusPill
                    status={getStatusVariant(r.status)}
                    jobId={r.id}
                    canManage={true}
                    onStatusChange={load}
                  />
                </div>
                {/* Lead installer name is not available in the base table */}
                <div style={{ color: theme.colors.text }}>—</div>
                <div>
                  <Link
                    href={`/job/${r.id}`}
                    className="glassmorphic-button glassmorphic-base glassmorphic-glow-cyan"
                    style={{
                      padding: "6px 10px",
                      textDecoration: 'none',
                      display: 'inline-block',
                      border: "none"
                    }}
                  >
                    Open
                  </Link>
                </div>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}