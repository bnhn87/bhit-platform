// apps/web/components/CostSummary.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { panelStyle, theme } from "../lib/theme";
import { useHasCostAccess } from "../hooks/useHasCostAccess";

type Rates = { installer?: number; supervisor?: number; vehicle?: number; waste_load?: number };
type CostRow = {
  job_id: string;
  quoted_total: number;
  installer_days: number;
  supervisor_days: number;
  vehicle_days: number;
  waste_loads: number;
  materials_cost: number;
  misc_cost: number;
};

export default function CostSummary({ jobId }: { jobId: string }) {
  const { allowed, loading: loadingPerm } = useHasCostAccess();

  const [rates, setRates] = useState<Rates>({});
  const [row, setRow] = useState<CostRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (loadingPerm || !allowed) return;
      setErr(null);

      const { data: org, error: rErr } = await supabase.from("org_settings").select("day_rates").eq("id", 1).maybeSingle();
      if (rErr) { if (!cancel) setErr(rErr.message); return; }
      const dr = (org?.day_rates || {}) as Record<string, number>;
      if (!cancel) {
        setRates({
          installer: Number(dr.installer || 0),
          supervisor: Number(dr.supervisor || 0),
          vehicle: Number(dr.vehicle || 0),
          waste_load: Number(dr.waste_load || 0),
        });
      }

      const { data: jc, error: cErr } = await supabase.from("job_costs").select("*").eq("job_id", jobId).maybeSingle();
      if (cErr) { if (!cancel) setErr(cErr.message); return; }
      if (!cancel) {
        setRow(jc ? normalizeRow(jc) : null);
      }
    })().catch((e) => !cancel && setErr(e?.message || "Failed to load"));
    return () => { cancel = true; };
  }, [jobId, allowed, loadingPerm]);

  if (loadingPerm) return null;              // wait until we know
  if (!allowed) return null;                 // hide entirely if no permission
  if (err) return <div style={{ ...panelStyle, padding: 16, color: theme.colors.danger }}>{err}</div>;
  if (!row) return <div style={{ ...panelStyle, padding: 16 }}>No cost data.</div>;

  const n = (v: any) => Number(v || 0);
  const price = n(row.quoted_total);
  const labour = n(row.installer_days) * (rates.installer || 0) + n(row.supervisor_days) * (rates.supervisor || 0);
  const vehicles = n(row.vehicle_days) * (rates.vehicle || 0);
  const waste = n(row.waste_loads) * (rates.waste_load || 0);
  const materials = n(row.materials_cost);
  const misc = n(row.misc_cost);
  const direct = labour + vehicles + waste + materials + misc;
  const margin = price - direct;

  return (
    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px,1fr))" }}>
      <KPI title="Quoted" value={fmt(price)} />
      <KPI title="Cost of Sale" value={fmt(direct)} />
      <KPI title="Net Margin" value={fmt(margin)} highlight />
    </div>
  );
}

function normalizeRow(x: any): CostRow {
  return {
    job_id: x.job_id,
    quoted_total: Number(x.quoted_total || 0),
    installer_days: Number(x.installer_days || 0),
    supervisor_days: Number(x.supervisor_days || 0),
    vehicle_days: Number(x.vehicle_days || 0),
    waste_loads: Number(x.waste_loads || 0),
    materials_cost: Number(x.materials_cost || 0),
    misc_cost: Number(x.misc_cost || 0),
  };
}

function KPI({ title, value, highlight }: { title: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ ...panelStyle, padding: 14 }}>
      <div style={{ fontSize: 12, color: theme.colors.subtext, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "0.2px", color: highlight ? (theme.colors as any).brand || theme.colors.accent : theme.colors.text }}>
        {value}
      </div>
    </div>
  );
}

function fmt(n: number) {
  if (!isFinite(n)) return "£0";
  return "£" + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
