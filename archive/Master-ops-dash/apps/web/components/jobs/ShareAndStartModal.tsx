import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";

export default function ShareAndStartModal({
  open,
  jobId,
  onClose
}: {
  open: boolean;
  jobId: string | null;
  onClose: () => void;
}) {
  const [pin, setPin] = useState("");
  const [token, setToken] = useState<string>("");
  const [validTo, setValidTo] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !jobId) return;
    (async () => {
      setMsg(null);
      // Load existing PIN if present
      const { data: pRow } = await supabase.from("job_pins").select("pin").eq("job_id", jobId).maybeSingle();
      if (pRow?.pin) setPin(pRow.pin);
      // Get or create token
      const rpc = await supabase.rpc("get_or_create_job_token", { p_job_id: jobId, p_hours_valid: 72 });
      if (rpc.error) {
        setMsg(rpc.error.message);
      } else {
        const row = (rpc.data as any[])?.[0];
        if (row) {
          setToken(row.token);
          setValidTo(row.valid_to);
        }
      }
    })();
  }, [open, jobId]);

  async function savePin() {
    if (!jobId) return;
    if (!/^\d{4}$/.test(pin)) {
      setMsg("PIN must be exactly 4 digits");
      return;
    }
    setBusy(true);
    const { error } = await supabase.rpc("set_job_pin", { p_job_id: jobId, p_pin: pin });
    setBusy(false);
    if (error) setMsg(error.message);
    else setMsg("PIN saved");
  }

  function guestUrl() {
    if (!token) return "";
    const base = typeof window === "undefined" ? "" : window.location.origin;
    return `${base}/today/guest?token=${encodeURIComponent(token)}`;
  }

  async function copy(s: string) {
    await navigator.clipboard.writeText(s);
    setMsg("Copied");
    setTimeout(() => setMsg(null), 1200);
  }

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 640,
          maxWidth: "95vw",
          background: theme.colors.panel,
          color: theme.colors.text,
          border: `1px solid ${theme.colors.panelBorder}`,
          borderRadius: 14,
          padding: 16
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ fontWeight: 700 }}>Share & Start</div>
          <button
            onClick={onClose}
            style={{ marginLeft: "auto", color: theme.colors.subtext, background: "transparent", border: 0, cursor: "pointer" }}
          >
            Close
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: theme.colors.subtext, marginBottom: 6 }}>Guest URL</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input readOnly value={guestUrl()} style={inputStyle({ flex: 1 })} />
              <button onClick={() => copy(guestUrl())} style={btnSecondary()}>Copy</button>
            </div>
            {validTo && (
              <div style={{ marginTop: 6, fontSize: 12, color: theme.colors.subtext }}>
                Valid until: {new Date(validTo).toLocaleString()}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: 12, color: theme.colors.subtext, marginBottom: 6 }}>Supervisor / Guest PIN (same)</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                placeholder="1234"
                maxLength={4}
                style={inputStyle({ width: 120, textAlign: "center", fontWeight: 700, letterSpacing: 2 })}
              />
              <button onClick={savePin} disabled={busy} style={btnPrimary(busy)}>Save PIN</button>
            </div>
          </div>

          {msg && (
            <div
              style={{
                padding: 8,
                borderLeft: `4px solid ${theme.colors.brand}`,
                background: "#0f151c",
                borderRadius: 8,
                color: theme.colors.text
              }}
            >
              {msg}
            </div>
          )}
        </div>
      </div>
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
function btnPrimary(disabled?: boolean): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 10,
    border: 0,
    background: theme.colors.accent,
    color: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1
  };
}
function btnSecondary(): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 10,
    border: `1px solid ${theme.colors.panelBorder}`,
    background: "#0f151c",
    color: theme.colors.text,
    cursor: "pointer"
  };
}
