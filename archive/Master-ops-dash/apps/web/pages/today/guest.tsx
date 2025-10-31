import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { panelStyle, theme } from "../../lib/theme";
import Link from "next/link";

type JobRow = {
  id: string;
  title: string;
  client_name: string | null;
  status: "planned" | "in_progress" | "completed" | "snagging";
  created_at: string;
};

export default function GuestPage() {
  const [token, setToken] = useState("");
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<JobRow | null>(null);
  const [settings, setSettings] = useState<{ guest_enabled: boolean; guest_can_view_docs: boolean } | null>(null);

  // Preload flags so we respect Settings
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("org_settings").select("guest_enabled, guest_can_view_docs").eq("id", 1).single();
      setSettings({ guest_enabled: !!data?.guest_enabled, guest_can_view_docs: !!data?.guest_can_view_docs });
    })();
  }, []);

  const qs = useMemo(() => {
    if (typeof window === "undefined") return {} as Record<string, string>;
    const u = new URL(window.location.href);
    const t = u.searchParams.get("token") || "";
    return { token: t };
  }, []);

  useEffect(() => {
    if (qs.token) setToken(qs.token);
  }, [qs]);

  async function unlock() {
    setMsg(null);
    if (!settings) { setMsg("Loading configuration…"); return; }
    if (!settings.guest_enabled) { setMsg("Guest access is disabled."); return; }
    if (!token.trim() || !pin.trim()) { setMsg("Enter token and PIN."); return; }
    setBusy(true);

    const { data, error } = await supabase.rpc("verify_guest_pin", { token, pin });
    setBusy(false);

    if (error) { setMsg(error.message); setJob(null); return; }

    const rows = (data as any[]) || [];
    if (rows.length === 0) { setMsg("Invalid or expired token, or wrong PIN."); setJob(null); return; }

    const j = rows[0] as JobRow;
    setJob(j);
    setMsg(null);
  }

  function pill(status: JobRow["status"]) {
    const color =
      status === "planned" ? theme.colors.subtext :
      status === "in_progress" ? theme.colors.accent :
      status === "snagging" ? theme.colors.warning :
      theme.colors.success;
    return (
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 10px",
        borderRadius: 999, background: "#111823", border: `1px solid ${theme.colors.panelBorder}`,
        color: theme.colors.text, fontSize: 12
      }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: color }} />
        {status === "in_progress" ? "In Progress" : status[0].toUpperCase()+status.slice(1)}
      </span>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: 0.2 }}>Guest Access</div>

      {/* Unlock */}
      {!job && (
        <div style={{ ...panelStyle, padding: 16 }}>
          <div style={{ display: "grid", gap: 10, maxWidth: 560 }}>
            <Field label="Token">
              <input value={token} onChange={(e) => setToken(e.target.value)} style={inputStyle()} placeholder="Paste shared token" />
            </Field>
            <Field label="PIN">
              <input value={pin} onChange={(e) => setPin(e.target.value)} style={inputStyle()} placeholder="4-digit PIN" maxLength={4} />
            </Field>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={unlock}
                disabled={busy}
                style={{
                  padding: "10px 14px",
                  background: theme.colors.accent,
                  color: "white",
                  border: 0,
                  borderRadius: 8,
                  cursor: busy ? "not-allowed" : "pointer",
                  opacity: busy ? 0.7 : 1
                }}
              >
                Unlock Job
              </button>
              {msg && <div style={{ alignSelf: "center", color: theme.colors.subtext }}>{msg}</div>}
            </div>
          </div>
        </div>
      )}

      {/* Read-only job view */}
      {job && (
        <div style={{ ...panelStyle, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontWeight: 800, fontSize: 20 }}>{job.title}</div>
            <div style={{ color: theme.colors.subtext }}>{job.client_name ?? "—"} • {new Date(job.created_at).toLocaleString()}</div>
            <div style={{ marginLeft: "auto" }}>{pill(job.status)}</div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <Link
              href={`/job/${job.id}`}
              style={{
                padding: "8px 12px",
                borderRadius: 10,
                border: `1px solid ${theme.colors.panelBorder}`,
                background: "#0f151c",
                color: theme.colors.text,
                textDecoration: "none"
              }}
            >
              Open Job (read-only)
            </Link>
            {!settings?.guest_can_view_docs && (
              <div style={{ alignSelf: "center", color: theme.colors.subtext }}>Document access disabled by admin</div>
            )}
          </div>
        </div>
      )}
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
function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "10px 12px",
    background: "#111823",
    border: `1px solid ${theme.colors.panelBorder}`,
    color: theme.colors.text,
    borderRadius: 8,
    ...(extra || {})
  };
}
