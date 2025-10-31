// apps/web/components/tabs/PlanningTab.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { panelStyle, theme } from "../../lib/theme";

type Planning = { job_id: string; status: "pending" | "ready" | "blocked"; notes: string | null };
type RiskRow = { id: string; job_id: string; code: string; label: string; level: "info" | "warn" | "critical" };

const RISK_OPTIONS: Array<{ code: string; label: string; level: RiskRow["level"] }> = [
  { code: "ELEVATION", label: "Work at height", level: "warn" },
  { code: "ASBESTOS", label: "Asbestos present/suspected", level: "critical" },
  { code: "LIVE_SITE", label: "Live client site constraints", level: "info" },
  { code: "POWER_ISOLATION", label: "Power isolation required", level: "warn" },
];

export default function PlanningTab({ jobId, canManage }: { jobId: string; canManage: boolean }) {
  const [p, setP] = useState<Planning | null>(null);
  const [risks, setRisks] = useState<RiskRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const riskByCode = useMemo(() => {
    const m = new Map<string, RiskRow>();
    risks.forEach((r) => m.set(r.code, r));
    return m;
  }, [risks]);

  async function load() {
    const [{ data: pData }, { data: rData }] = await Promise.all([
      supabase.from("job_planning").select("*").eq("job_id", jobId).maybeSingle(),
      supabase.from("job_risk_flags").select("*").eq("job_id", jobId).order("created_at", { ascending: false }),
    ]);
    if (pData) setP(pData as Planning);
    if (Array.isArray(rData)) setRisks(rData as RiskRow[]);
  }

  useEffect(() => {
    load();
    // live refresh on flags changes
    const ch = supabase
      .channel(`risk_${jobId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_risk_flags", filter: `job_id=eq.${jobId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function savePlanning(next: Partial<Planning>) {
    if (!p) return;
    setSaving(true);
    setMsg(null);
    try {
      const payload = { ...p, ...next };
      const { error } = await supabase.from("job_planning").upsert(payload, { onConflict: "job_id" });
      if (error) throw error;
      setP(payload as Planning);
    } catch (e: any) {
      setMsg(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function toggleRisk(opt: typeof RISK_OPTIONS[number]) {
    const existing = riskByCode.get(opt.code);
    if (existing) {
      await supabase.from("job_risk_flags").delete().eq("id", existing.id);
    } else {
      await supabase.from("job_risk_flags").insert({
        job_id: jobId, code: opt.code, label: opt.label, level: opt.level,
      });
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ ...panelStyle, padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Planning status</div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {(["pending", "ready", "blocked"] as const).map((s) => {
            const active = p?.status === s;
            return (
              <button
                key={s}
                disabled={!canManage}
                onClick={() => savePlanning({ status: s })}
                style={{
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: `1px solid ${active ? theme.colors.brand : theme.colors.panelBorder}`,
                  background: active ? "rgba(245, 158, 11, 0.15)" : "#0f151c",
                  color: theme.colors.text,
                  cursor: canManage ? "pointer" : "default",
                }}
              >
                {s[0].toUpperCase() + s.slice(1)}
              </button>
            );
          })}
          <span style={{ marginLeft: 12, color: theme.colors.subtext, fontSize: 12 }}>
            {saving ? "Saving…" : msg}
          </span>
        </div>
      </div>

      <div style={{ ...panelStyle, padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Risk flags</div>
        <div style={{ display: "grid", gap: 8 }}>
          {RISK_OPTIONS.map((opt) => {
            const active = !!riskByCode.get(opt.code);
            return (
              <label key={opt.code} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="checkbox"
                  disabled={!canManage}
                  checked={active}
                  onChange={() => toggleRisk(opt)}
                />
                <span>{opt.label}</span>
                <span style={{ marginLeft: 8, fontSize: 12, color: theme.colors.subtext }}>
                  {opt.level.toUpperCase()}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div style={{ ...panelStyle, padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Notes</div>
        <textarea
          disabled={!canManage}
          value={p?.notes ?? ""}
          onChange={(e) => savePlanning({ notes: e.target.value })}
          placeholder="Planning notes, special instructions, access details..."
          style={{
            width: "100%",
            minHeight: 120,
            resize: "vertical",
            borderRadius: 10,
            border: `1px solid ${theme.colors.panelBorder}`,
            background: "#111823",
            color: theme.colors.text,
            padding: 12,
          }}
        />
      </div>
    </div>
  );
}
