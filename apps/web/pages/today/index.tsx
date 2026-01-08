// apps/web/pages/today/index.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import StatusPill from "../../components/jobs/StatusPill";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";

// Define JobStatus for this page
type JobStatus = "planned" | "in_progress" | "delayed" | "on_hold" | "completed";

// Legacy database status mapping (same as jobs page)
const _LEGACY_STATUS_MAP: Record<string, JobStatus> = {
  'planned': 'planned',
  'in_progress': 'in_progress',
  'installing': 'in_progress', // Legacy mapping
  'snagging': 'delayed', // Map snagging to delayed
  'completed': 'completed',
  'on_hold': 'on_hold',
  'delayed': 'delayed'
};

// Reverse mapping for database updates
const _DB_STATUS_MAP: Record<JobStatus, string> = {
  'planned': 'planned',
  'in_progress': 'in_progress',
  'delayed': 'snagging', // Map delayed UI status to 'snagging' in database
  'on_hold': 'snagging', // Map on_hold UI status to 'snagging' in database (no on_hold in DB)
  'completed': 'completed'
};

type JobLite = {
  id: string;
  reference: string | null;
  title: string;
  client_name: string | null;
  status: "planned" | "in_progress" | "completed" | "snagging";
  created_at: string;
};

type AlertRow = { id: string; text: string; occurred_at: string };

export default function Today() {
  useRequireAuth();
  const router = useRouter();

  const [counts, setCounts] = useState({ planned: 0, in_progress: 0, snagging: 0 });
  const [nextJobs, setNextJobs] = useState<JobLite[]>([]);
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);

      const [cPlanned, cProg, cSnag] = await Promise.all([
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "planned").is("deleted_at", null),
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "in_progress").is("deleted_at", null),
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "snagging").is("deleted_at", null)
      ]);

      const { data: jobsList } = await supabase
        .from("jobs")
        .select("id, reference, title, client_name, status, created_at")
        .in("status", ["planned", "in_progress"])
        .is("deleted_at", null)
        .order("status", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(4);

      const { data: alertsList } = await supabase
        .from("activity_log")
        .select("id, text, occurred_at")
        .order("occurred_at", { ascending: false })
        .limit(6);

      if (!active) return;

      setCounts({
        planned: cPlanned.count || 0,
        in_progress: cProg.count || 0,
        snagging: cSnag.count || 0
      });
      setNextJobs((jobsList as JobLite[]) || []);
      setAlerts((alertsList as AlertRow[]) || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  return (<>
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        <Kpi title="Planned" value={counts.planned} accent />
        <Kpi title="In Progress" value={counts.in_progress} />
        <Kpi title="Snagging" value={counts.snagging} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Next 4 Jobs</span>
            <button
              onClick={() => router.push('/jobs')}
              style={{
                background: "transparent",
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.text,
                padding: "4px 8px",
                borderRadius: 4,
                fontSize: 12,
                cursor: "pointer"
              }}
            >
              View All
            </button>
          </div>
          {loading ? (
            <div style={{ color: theme.colors.textSubtle }}>Loading...</div>
          ) : nextJobs.length === 0 ? (
            <div style={{ color: theme.colors.textSubtle }}>No upcoming jobs.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {nextJobs.map((j) => (
                <li
                  key={j.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(180px, 1fr) 1fr auto",
                    gap: 12,
                    padding: "10px 12px",
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: 10,
                  }}
                >
                  <Link
                    href={`/jobs/${j.id}`} style={{ fontWeight: 600, color: theme.colors.text, textDecoration: 'none' }}>
                    {j.reference ? `${j.reference} — ` : ""}
                    {j.title}
                  </Link>
                  <div style={{ color: theme.colors.textSubtle }}>{j.client_name ?? "-"}</div>
                  <div style={{ justifySelf: "end" }}>
                    <StatusPill
                      status={j.status}
                      jobId={j.id}
                      canManage={true}
                      onStatusChange={(newStatus) => {
                        // Update local state with new status
                        setNextJobs(prev => prev.map(job =>
                          job.id === j.id ? { ...job, status: newStatus } : job
                        ));
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Automation Alerts</div>
          {loading ? (
            <div style={{ color: theme.colors.textSubtle }}>Loading...</div>
          ) : alerts.length === 0 ? (
            <div style={{ color: theme.colors.textSubtle }}>All quiet.</div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
              {alerts.map((a) => (
                <li
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: 10
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 99,
                      background: theme.colors.accent
                    }}
                  />
                  <div style={{ flex: 1 }}>{a.text}</div>
                  <div style={{ color: theme.colors.textSubtle, fontSize: 12 }}>
                    {new Date(a.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>

  </>);
}

function Kpi({ title, value, accent = false }: { title: string; value: number | string; accent?: boolean }) {
  return (<>
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 12, color: theme.colors.textSubtle, marginBottom: 6 }}>
        {title.toUpperCase()}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 0.2, color: accent ? theme.colors.accent : theme.colors.text }}>
        {value}
      </div>
    </div>

  </>);
}