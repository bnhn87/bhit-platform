import { Fragment, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { useUserRole } from "../../hooks/useUserRole";
import { panelStyle, theme } from "../../lib/theme";

type OrgSettings = {
  id: number;
  company_name: string | null;
  brand_color: string | null;
  day_rates: Record<string, number> | null;
  guest_enabled: boolean;
  guest_can_view_docs: boolean;
  cost_visibility: "director" | "ops+director";
};

export default function SettingsPage() {
  useRequireAuth();
  const { role } = useUserRole();
  const isDirector = role === "director";
  const [s, setS] = useState<OrgSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("org_settings").select("*").eq("id", 1).single();
      if (error) {
        // Create a local default; first save will persist it.
        const fallback: OrgSettings = {
          id: 1,
          company_name: null,
          brand_color: "#f59e0b",
          day_rates: {},
          guest_enabled: true,
          guest_can_view_docs: true,
          cost_visibility: "director"
        };
        setS(fallback);
      } else {
        const d = (data || {}) as any;
        const merged: OrgSettings = {
          id: 1,
          company_name: d.company_name ?? null,
          brand_color: d.brand_color ?? "#f59e0b",
          day_rates: d.day_rates ?? {},
          guest_enabled: d.guest_enabled ?? true,
          guest_can_view_docs: d.guest_can_view_docs ?? true,
          cost_visibility: (d.cost_visibility ?? "director") as OrgSettings["cost_visibility"]
        };
        setS(merged);
      }
    })();
  }, []);

  async function save() {
    if (!s) return;
    setBusy(true);
    setMsg(null);
    const payload = {
      id: 1,
      company_name: s.company_name,
      brand_color: s.brand_color || "#f59e0b",
      day_rates: s.day_rates || {},
      guest_enabled: !!s.guest_enabled,
      guest_can_view_docs: !!s.guest_can_view_docs,
      cost_visibility: s.cost_visibility
    };
    const { error } = await supabase.from("org_settings").upsert(payload, { onConflict: "id" });
    setBusy(false);
    setMsg(error ? error.message : "Saved");
  }

  function setRate(key: string, value: number) {
    setS((prev) => {
      const next = { ...(prev as OrgSettings) };
      next.day_rates = { ...(next.day_rates || {}), [key]: value };
      return next;
    });
  }

  if (!s) return <div style={{ ...panelStyle, padding: 16 }}>Loading…</div>;

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 960 }}>
      <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: 0.2 }}>Settings</div>

      {/* Organisation */}
      <Card title="Organisation">
        <Field label="Company name">
          <input
            value={s.company_name ?? ""}
            onChange={(e) => setS({ ...s, company_name: e.target.value })}
            style={inputStyle()}
          />
        </Field>
        <Field label="Brand color">
          <input
            type="color"
            value={s.brand_color || "#f59e0b"}
            onChange={(e) => setS({ ...s, brand_color: e.target.value })}
            style={{ width: 60, height: 36, background: "transparent", border: "none" }}
          />
        </Field>
      </Card>

      {/* Access & Roles */}
      <Card title="Access & Roles" note={!isDirector ? "Read-only (Director only)" : undefined}>
        <Field label="Guest links enabled">
          <Toggle
            checked={!!s.guest_enabled}
            onChange={(v) => isDirector && setS({ ...s, guest_enabled: v })}
            disabled={!isDirector}
          />
        </Field>
        <Field label="Guests can open documents">
          <Toggle
            checked={!!s.guest_can_view_docs}
            onChange={(v) => isDirector && setS({ ...s, guest_can_view_docs: v })}
            disabled={!isDirector}
          />
        </Field>
        <Field label="Costs visible to">
          <select
            value={s.cost_visibility}
            onChange={(e) => isDirector && setS({ ...s, cost_visibility: e.target.value as OrgSettings["cost_visibility"] })}
            style={inputStyle()}
            disabled={!isDirector}
          >
            <option value="director">Director only</option>
            <option value="ops+director">Ops + Director</option>
          </select>
        </Field>
      </Card>

      {/* Day Rates */}
      <Card title="Day Rates">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 8, alignItems: "center" }}>
          {[
            ["installer", "Installer (£/day)"],
            ["supervisor", "Supervisor (£/day)"],
            ["vehicle", "Vehicle (£/day)"],
            ["waste_load", "Waste load (£/load)"]
          ].map(([k, label]) => (
            <Fragment key={k}>
              <div style={{ color: theme.colors.subtext }}>{label}</div>
              <input
                type="number"
                value={Number((s.day_rates || {})[k]) || 0}
                onChange={(e) => setRate(k, Number(e.target.value))}
                style={inputStyle({ textAlign: "right" })}
              />
            </Fragment>
          ))}
        </div>
      </Card>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={save}
          disabled={busy || !isDirector}
          style={{
            padding: "10px 14px",
            background: theme.colors.accent,
            color: "white",
            border: 0,
            borderRadius: 8,
            cursor: busy || !isDirector ? "not-allowed" : "pointer",
            opacity: busy || !isDirector ? 0.7 : 1
          }}
        >
          Save
        </button>
        {msg && <div style={{ alignSelf: "center", color: theme.colors.subtext }}>{msg}</div>}
      </div>
    </div>
  );
}

function Card({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <div style={{ ...panelStyle, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        {note && <div style={{ marginLeft: 8, fontSize: 12, color: theme.colors.subtext }}>({note})</div>}
      </div>
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 10, alignItems: "center" }}>
      <div style={{ fontSize: 12, color: theme.colors.subtext }}>{label}</div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 54,
        height: 28,
        borderRadius: 999,
        border: `1px solid ${theme.colors.panelBorder}`,
        background: checked ? theme.colors.accent : "#111823",
        position: "relative",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 28 : 2,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: "#fff"
        }}
      />
    </button>
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
