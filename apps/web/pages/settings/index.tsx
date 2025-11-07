import { Fragment, useEffect, useState } from "react";

import { InvoicePermissions } from "../../components/InvoicePermissions";
import { BannerPreferencesComponent } from "../../components/settings/BannerPreferences";
import { VehicleManagement } from "../../components/VehicleManagement";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { useUserRole } from "../../hooks/useUserRole";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";
import { loadConfig, saveConfig } from "../../modules/smartquote/services/configService";
import { Vehicle } from "../../modules/smartquote/types";

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
  const [smartQuoteConfig, setSmartQuoteConfig] = useState(() => loadConfig());
  const [vehicleMsg, setVehicleMsg] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      // Get current user's account ID
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('users')
          .select('account_id')
          .eq('account_id', user.id)
          .single();
        if (userData) {
          setAccountId(userData.account_id);
        }
      }

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
        const d = (data || {}) as Record<string, unknown>;
        const merged: OrgSettings = {
          id: 1,
          company_name: (d.company_name as string | null | undefined) ?? null,
          brand_color: (d.brand_color as string | undefined) ?? "#f59e0b",
          day_rates: (d.day_rates as Record<string, number> | undefined) ?? {},
          guest_enabled: (d.guest_enabled as boolean | undefined) ?? true,
          guest_can_view_docs: (d.guest_can_view_docs as boolean | undefined) ?? true,
          cost_visibility: ((d.cost_visibility as string | undefined) ?? "director") as OrgSettings["cost_visibility"]
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

  function handleVehiclesChange(vehicles: Record<string, Vehicle>) {
    const updatedConfig = { ...smartQuoteConfig, vehicles };
    setSmartQuoteConfig(updatedConfig);
    saveConfig(updatedConfig);
    setVehicleMsg("Vehicle configuration saved");
    setTimeout(() => setVehicleMsg(null), 3000);
  }

  if (!s) return <div style={{ padding: 16 }}>Loading...</div>;

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

      {/* Invoice Permissions */}
      {accountId && (
        <Card title="Invoice Schedule Permissions" note={!isDirector ? "Director only" : undefined}>
          <InvoicePermissions isDirector={isDirector} accountId={accountId} />
        </Card>
      )}

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
              <div style={{ color: theme.colors.textSubtle }}>{label}</div>
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

      {/* Task Banner Preferences */}
      <Card title="Task Banner Preferences" note="Personalize your highway">
        <BannerPreferencesComponent />
      </Card>

      {/* Vehicle Management */}
      <Card title="Vehicle Fleet Management" note="SmartQuote Module">
        <VehicleManagement
          vehicles={smartQuoteConfig.vehicles}
          onVehiclesChange={handleVehiclesChange}
          readonly={!isDirector}
        />
        {vehicleMsg && (
          <div style={{
            marginTop: 12,
            padding: 8,
            background: theme.colors.accent,
            color: 'white',
            borderRadius: 6,
            fontSize: 12
          }}>
            {vehicleMsg}
          </div>
        )}
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
        {msg && <div style={{ alignSelf: "center", color: theme.colors.textSubtle }}>{msg}</div>}
      </div>
    </div>
  );
}

function Card({ title, children, note }: { title: string; children: React.ReactNode; note?: string }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>{title}</div>
        {note && <div style={{ marginLeft: 8, fontSize: 12, color: theme.colors.textSubtle }}>({note})</div>}
      </div>
      <div style={{ display: "grid", gap: 8 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 10, alignItems: "center" }}>
      <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>{label}</div>
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
        border: `1px solid ${theme.colors.border}`,
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
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.text,
    borderRadius: 8,
    ...(extra || {})
  };
}
