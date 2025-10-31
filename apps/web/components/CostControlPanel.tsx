// apps/web/components/CostControlPanel.tsx
import { useEffect, useMemo, useState } from "react";

import { supabase } from "../lib/supabaseClient";
import { theme } from "../lib/theme";
import { DayRates, OrganizationSettings, SupabaseError } from "../lib/types";

type CostRow = {
  job_id: string;
  quoted_total: number | string;
  installer_days: number | string;
  supervisor_days: number | string;
  vehicle_days: number | string;
  waste_loads: number | string;
  materials_cost: number | string;
  misc_cost: number | string;
  notes?: string | null;
};

export default function CostControlPanel({ jobId }: { jobId: string }) {
  const [rates, setRates] = useState<DayRates>({installer: 0, supervisor: 0, vehicle: 0, waste_load: 0});
  const [row, setRow] = useState<CostRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setErr(null);
      // 1) load day rates
      const { data: org } = await supabase.from("org_settings").select("day_rates").eq("id", 1).maybeSingle();
      const orgData = org as OrganizationSettings | null;
      const dr = orgData?.day_rates || { installer: 0, supervisor: 0, vehicle: 0, waste_load: 0 };
      if (!cancel) {
        setRates({
          installer: Number(dr.installer || 0),
          supervisor: Number(dr.supervisor || 0),
          vehicle: Number(dr.vehicle || 0),
          waste_load: Number(dr.waste_load || 0),
        });
      }
      // 2) load or create job_costs row
      const { data: jc } = await supabase.from("job_costs").select("*").eq("job_id", jobId).maybeSingle();
      if (!cancel) {
        if (jc) {
          setRow(normalizeRow(jc));
        } else {
          setRow({
            job_id: jobId,
            quoted_total: 0,
            installer_days: 0,
            supervisor_days: 0,
            vehicle_days: 0,
            waste_loads: 0,
            materials_cost: 0,
            misc_cost: 0,
            notes: "",
          });
        }
      }
    })().catch((e: SupabaseError) => !cancel && setErr(e?.message || "Failed to load costs"));
    return () => { cancel = true; };
  }, [jobId]);

  const numbers = useMemo(() => {
    const r = row || {} as CostRow;
    const n = (v: number | string) => Number(v || 0);

    const price = n(r.quoted_total);

    const labour =
      n(r.installer_days) * (rates.installer || 0) +
      n(r.supervisor_days) * (rates.supervisor || 0);

    const vehicles = n(r.vehicle_days) * (rates.vehicle || 0);
    const waste = n(r.waste_loads) * (rates.waste_load || 0);
    const materials = n(r.materials_cost);
    const misc = n(r.misc_cost);

    const direct = labour + vehicles + waste + materials + misc;
    const margin = price - direct;
    const marginPct = price > 0 ? (margin / price) * 100 : 0;

    return { price, labour, vehicles, waste, materials, misc, direct, margin, marginPct };
  }, [row, rates]);

  async function save() {
    if (!row) return;
    setBusy(true); setMsg(null); setErr(null);
    const payload = {
      job_id: jobId,
      quoted_total: toNum(row.quoted_total),
      installer_days: toNum(row.installer_days),
      supervisor_days: toNum(row.supervisor_days),
      vehicle_days: toNum(row.vehicle_days),
      waste_loads: toNum(row.waste_loads),
      materials_cost: toNum(row.materials_cost),
      misc_cost: toNum(row.misc_cost),
      notes: row.notes ?? null,
    };
    const { error } = await supabase.from("job_costs").upsert(payload, { onConflict: "job_id" });
    setBusy(false);
    if (error) setErr(error.message);
    else setMsg("Saved");
  }

  if (!row) return <div style={{ padding: 16 }}>Loading...</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* KPIs */}
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <KPI title="Price (Quoted)" value={fmtCurrency(numbers.price)} />
        <KPI title="Direct Cost" value={fmtCurrency(numbers.direct)} />
        <KPI title="Net Margin" value={fmtCurrency(numbers.margin)} />
        <KPI title="Margin %" value={`${numbers.marginPct.toFixed(1)}%`} />
      </div>

      {/* Inputs */}
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Inputs</div>

        <GridRow label="Quoted total (£)">
          <NumInput value={row.quoted_total} onChange={(v) => setRow({ ...row, quoted_total: v })} />
        </GridRow>

        <Divider />

        <GridRow label="Installer days">
          <NumInput value={row.installer_days} onChange={(v) => setRow({ ...row, installer_days: v })} />
          <Hint right label="Rate" value={fmtCurrency(rates.installer || 0)} />
          <Hint right label="Cost" value={fmtCurrency(toNum(row.installer_days) * (rates.installer || 0))} />
        </GridRow>

        <GridRow label="Supervisor days">
          <NumInput value={row.supervisor_days} onChange={(v) => setRow({ ...row, supervisor_days: v })} />
          <Hint right label="Rate" value={fmtCurrency(rates.supervisor || 0)} />
        </GridRow>

        <GridRow label="Vehicle days">
          <NumInput value={row.vehicle_days} onChange={(v) => setRow({ ...row, vehicle_days: v })} />
          <Hint right label="Rate" value={fmtCurrency(rates.vehicle || 0)} />
          <Hint right label="Cost" value={fmtCurrency(numbers.vehicles)} />
        </GridRow>

        <GridRow label="Waste loads">
          <NumInput value={row.waste_loads} onChange={(v) => setRow({ ...row, waste_loads: v })} />
          <Hint right label="Rate" value={fmtCurrency(rates.waste_load || 0)} />
          <Hint right label="Cost" value={fmtCurrency(numbers.waste)} />
        </GridRow>

        <GridRow label="Materials cost (£)">
          <NumInput value={row.materials_cost} onChange={(v) => setRow({ ...row, materials_cost: v })} />
        </GridRow>

        <GridRow label="Misc cost (£)">
          <NumInput value={row.misc_cost} onChange={(v) => setRow({ ...row, misc_cost: v })} />
        </GridRow>

        <GridRow label="Notes">
          <textarea
            value={row.notes || ""}
            onChange={(e) => setRow({ ...row, notes: e.target.value })}
            style={inputStyle({ height: 90, resize: "vertical" })}
          />
        </GridRow>

        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={save} disabled={busy} style={btnPrimary()}>
            Save
          </button>
          {msg && <div style={{ alignSelf: "center", color: theme.colors.textSubtle }}>{msg}</div>}
          {err && <div style={{ alignSelf: "center", color: theme.colors.danger }}>{err}</div>}
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Breakdown</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 6 }}>
          <Row label="Labour">{fmtCurrency(numbers.labour)}</Row>
          <Row label="Vehicles">{fmtCurrency(numbers.vehicles)}</Row>
          <Row label="Waste">{fmtCurrency(numbers.waste)}</Row>
          <Row label="Materials">{fmtCurrency(numbers.materials)}</Row>
          <Row label="Misc">{fmtCurrency(numbers.misc)}</Row>
          <Row label="Direct Cost" strong>{fmtCurrency(numbers.direct)}</Row>
          <Row label="Price (Quoted)" strong>{fmtCurrency(numbers.price)}</Row>
          <Row label="Net Margin" brand big>
            {fmtCurrency(numbers.margin)}
          </Row>
          <Row label="Margin %" brand big>
            {numbers.marginPct.toFixed(1)}%
          </Row>
        </div>
      </div>
    </div>
  );
}

/* ---------- atoms / helpers ---------- */

function normalizeRow(x: Partial<CostRow>): CostRow {
  return {
    job_id: x.job_id || "",
    quoted_total: x.quoted_total ?? 0,
    installer_days: x.installer_days ?? 0,
    supervisor_days: x.supervisor_days ?? 0,
    vehicle_days: x.vehicle_days ?? 0,
    waste_loads: x.waste_loads ?? 0,
    materials_cost: x.materials_cost ?? 0,
    misc_cost: x.misc_cost ?? 0,
    notes: x.notes ?? "",
  };
}
const toNum = (v: number | string) => Number(v || 0);

function KPI({ title, value }: { title: string; value: string }) {
  return (
    <div style={{ padding: 14 }}>
      <div style={{ fontSize: 12, color: theme.colors.textSubtle, marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "0.2px" }}>{value}</div>
    </div>
  );
}

function GridRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 10, alignItems: "center", margin: "6px 0" }}>
      <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>{label}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>{children}</div>
    </div>
  );
}

function Hint({ label, value, right }: { label: string; value: string; right?: boolean }) {
  return (
    <div style={{ marginLeft: right ? "auto" : 0, fontSize: 12, color: theme.colors.textSubtle }}>
      {label}: <span style={{ color: theme.colors.text }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: theme.colors.border, margin: "10px 0" }} />;
}

function NumInput({ value, onChange }: { value: number | string; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      step="0.01"
      value={Number(value || 0)}
      onChange={(e) => onChange(Number(e.target.value))}
      style={inputStyle({ textAlign: "right", maxWidth: 180 })}
    />
  );
}
function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "10px 12px",
    background: "#111823",
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.text,
    borderRadius: 8,
    ...extra,
  };
}

function btnPrimary(): React.CSSProperties {
  return {
    padding: "10px 14px",
    background: theme.colors.accent,
    color: "#fff",
    border: 0,
    borderRadius: 8,
    cursor: "pointer",
    fontWeight: 700,
  };
}

function Row({
  label, children, strong, brand, big,
}: {
  label: string;
  children: React.ReactNode;
  strong?: boolean;
  brand?: boolean;
  big?: boolean;
}) {
  return (
    <>
      <div style={{ color: theme.colors.textSubtle }}>{label}</div>
      <div
        style={{
          textAlign: "right",
          fontWeight: strong || big ? 700 : 500,
          color: brand ? theme.colors.accent : theme.colors.text,
          fontSize: big ? 18 : 14,
          letterSpacing: big ? "0.2px" : undefined,
        }}
      >
        {children}
      </div>
    </>
  );
}

function fmtCurrency(n: number) {
  if (!isFinite(n)) return "£0";
  return "£" + n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
