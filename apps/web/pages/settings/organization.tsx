// apps/web/pages/settings/organization.tsx
import React, { useEffect, useState, Fragment } from "react";

import Layout from "../../components/Layout";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";

type OrgSettings = {
  id: number;
  company_name: string | null;
  brand_color: string | null;
  day_rates: Record<string, number> | null;
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "220px 1fr",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>{label}</div>
      {children}
    </div>
  );
}

function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "10px 12px",
    background: "#111823",
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.text,
    borderRadius: 8,
    ...(extra || {}),
  };
}

export default function OrganizationSettings() {
  useRequireAuth();

  const [s, setS] = useState<OrgSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("org_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) {
        setMsg(error.message);
      }
      const initial: OrgSettings = data || {
        id: 1,
        company_name: null,
        brand_color: "#f59e0b",
        day_rates: {},
      };
      setS(initial);
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
    };
    const { error } = await supabase
      .from("org_settings")
      .upsert(payload, { onConflict: "id" });
    setBusy(false);
    setMsg(error ? error.message : "Saved");
  }

  function setRate(key: string, value: number) {
    setS((prev) => {
      const next = { ...(prev || { id: 1, day_rates: {} }) } as OrgSettings;
      next.day_rates = { ...(next.day_rates || {}), [key]: value };
      return next;
    });
  }

  if (!s) {
    return (
      <Layout>
        <div style={{ padding: 16 }}>Loading...</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ display: "grid", gap: 16, maxWidth: 820 }}>
        <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 0.2 }}>
          Organization
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Basics</div>
          <div style={{ display: "grid", gap: 12 }}>
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
                value={(s.brand_color as string) || "#f59e0b"}
                onChange={(e) => setS({ ...s, brand_color: e.target.value })}
                style={{
                  width: 60,
                  height: 36,
                  background: "transparent",
                  border: "none",
                }}
              />
            </Field>
          </div>
        </div>

        <div style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Day rates</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 160px",
              gap: 8,
              alignItems: "center",
            }}
          >
            {([
              ["installer", "Installer (£/day)"],
              ["supervisor", "Supervisor (£/day)"],
              ["vehicle", "Vehicle (£/day)"],
              ["waste_load", "Waste load (£/load)"],
            ] as const).map(([k, label]) => (
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
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={save}
            disabled={busy}
            style={{
              padding: "10px 14px",
              background: theme.colors.accent,
              color: "white",
              border: 0,
              borderRadius: 8,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.7 : 1,
            }}
          >
            Save
          </button>
          {msg && (
            <div style={{ alignSelf: "center", color: theme.colors.textSubtle }}>
              {msg}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
