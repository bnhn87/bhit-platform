import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";

import { useRequireAuth } from "../../hooks/useRequireAuth";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";


export default function CloseDay() {
  useRequireAuth();
  const r = useRouter();
  const jobId = typeof r.query.jobId === "string" ? r.query.jobId : undefined;

  const [crew, setCrew] = useState(0);
  const [waste, setWaste] = useState(0);
  const [buffer, setBuffer] = useState(0);
  const [notes, setNotes] = useState("");
  const [photosCount, setPhotosCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    if (!jobId) return;
    setBusy(true);
    setMsg(null);

    try {
      // 1) Insert the day report
      const { error: reportErr } = await supabase.from("day_reports").insert({
        job_id: jobId,
        crew_count: crew,
        waste_loads: waste,
        buffer_used_percent: buffer,
        photos_count: photosCount,
        notes
      });
      if (reportErr) throw reportErr;

      // 2) Fetch org settings for rates (safe fallbacks)
      const { data: org } = await supabase
        .from("org_settings")
        .select("*")
        .eq("id", 1)
        .single();

      const rates = ((org?.day_rates as Record<string, number>) || {}) as Record<string, number>;
      const installerRate = Number(rates.installer || 0);
      const vehicleRate = Number(rates.vehicle || 0);
      const wasteRate = Number(rates.waste_load || 0);
      const vat = typeof org?.vat_rate === "number" ? org!.vat_rate : 0;

      // 3) Build baseline cost items from the form
      const items = [
        crew > 0
          ? {
            job_id: jobId,
            kind: "labour",
            description: "Crew days",
            qty: crew,
            unit: "day",
            unit_cost: installerRate,
            unit_price: null,
            tax_rate: vat,
            meta: {}
          }
          : null,
        waste > 0
          ? {
            job_id: jobId,
            kind: "waste",
            description: "Waste loads",
            qty: waste,
            unit: "load",
            unit_cost: wasteRate,
            unit_price: null,
            tax_rate: vat,
            meta: {}
          }
          : null,
        // Optional convention: one vehicle per active crew day
        crew > 0
          ? {
            job_id: jobId,
            kind: "vehicle",
            description: "Vehicle day",
            qty: 1,
            unit: "day",
            unit_cost: vehicleRate,
            unit_price: null,
            tax_rate: vat,
            meta: {}
          }
          : null
      ].filter(Boolean) as Array<unknown>;

      if (items.length) {
        const { error: costErr } = await supabase.from("job_cost_items").insert(items);
        if (costErr) throw costErr;
      }

      setMsg("Day report saved.");
      // Optionally navigate back to the job after a short delay
      r.push(`/jobs/${jobId}`);
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Failed to save day report.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 640 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <Link href={`/jobs/${jobId}`} style={{ color: theme.colors.textSubtle, textDecoration: "none" }}>
          ← Back
        </Link>
        <h2 style={{ margin: 0 }}>Close Day</h2>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <NumberRow label="Crew count" value={crew} onChange={setCrew} />
        <NumberRow label="Waste loads" value={waste} onChange={setWaste} />
        <NumberRow label="Buffer used (%)" value={buffer} onChange={setBuffer} />
        <NumberRow label="Photos taken" value={photosCount} onChange={setPhotosCount} />

        <div>
          <div style={{ fontSize: 12, color: theme.colors.textSubtle, marginBottom: 6 }}>Notes</div>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              background: "#111823",
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.text,
              borderRadius: 8
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={submit}
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
            Save Report
          </button>
          {msg && <div style={{ alignSelf: "center", color: theme.colors.textSubtle }}>{msg}</div>}
        </div>
      </div>
    </div>
  );
}

function NumberRow({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 12, color: theme.colors.textSubtle, marginBottom: 6 }}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          padding: "10px 12px",
          background: "#111823",
          border: `1px solid ${theme.colors.border}`,
          color: theme.colors.text,
          borderRadius: 8
        }}
      />
    </div>
  );
}
