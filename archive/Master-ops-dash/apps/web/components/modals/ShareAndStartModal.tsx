/**
 * ShareAndStartModal — QR + link + 4-digit PIN (idempotent)
 *
 * Assumptions:
 * - Table: public.temp_access_tokens (token uuid, job_id uuid, pin text, created_at, expires_at)
 * - Intended usage: <ShareAndStartModal open jobId onClose={() => …} />
 * - Uses a free QR image API for convenience; link + PIN are sufficient if blocked.
 */

import React from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/lib/theme";

type Props = {
  open: boolean;
  jobId: string;
  onClose: () => void;
};

export default function ShareAndStartModal({ open, jobId, onClose }: Props) {
  const [pin, setPin] = React.useState<string>("");
  const [token, setToken] = React.useState<string>("");
  const [err, setErr] = React.useState<string | null>(null);

  const origin =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const guestUrl = `${origin}/today/guest?token=${encodeURIComponent(token)}`;

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      setErr(null);
      // 4-digit numeric PIN
      const p = Math.floor(1000 + Math.random() * 9000).toString();
      const { data, error } = await supabase
        .from("temp_access_tokens")
        .insert({ job_id: jobId, pin: p })
        .select("token")
        .single();
      if (error) {
        setErr(error.message);
      } else {
        setPin(p);
        setToken(data?.token ?? "");
      }
    })();
  }, [open, jobId]);

  if (!open) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(720px, 92vw)",
          borderRadius: 16,
          padding: 16,
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(10px)",
          border: `1px solid ${theme?.colors?.panelBorder ?? "rgba(255,255,255,0.12)"}`,
          color: theme?.colors?.text ?? "#e8eef6",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0 }}>Share & Start</h3>
          <button onClick={onClose} style={chipBtn()}>Close</button>
        </header>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 }}>
          <div
            style={{
              borderRadius: 12,
              border: `1px solid ${theme?.colors?.panelBorder ?? "rgba(255,255,255,0.12)"}`,
              background: "rgba(0,0,0,0.35)",
              display: "grid",
              placeItems: "center",
              padding: 10,
            }}
          >
            {token ? (
              <img
                alt="QR"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  guestUrl
                )}`}
                style={{ display: "block", width: 200, height: 200 }}
              />
            ) : (
              <div style={{ opacity: 0.7 }}>Generating…</div>
            )}
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {err && <div style={{ color: "#ff7777" }}>{err}</div>}

            <div>
              <div style={{ opacity: 0.8, fontSize: 12, marginBottom: 4 }}>Guest Link</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <input readOnly value={guestUrl} style={inputStyle()} />
                <button
                  style={chipBtn()}
                  onClick={() => navigator.clipboard.writeText(guestUrl)}
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <div style={{ opacity: 0.8, fontSize: 12, marginBottom: 4 }}>PIN (valid until expiry)</div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px auto",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <input readOnly value={pin} style={inputStyle()} />
                <span style={{ opacity: 0.7, fontSize: 12 }}>
                  Expires end of day automatically.
                </span>
              </div>
            </div>
          </div>
        </div>

        <footer style={{ marginTop: 16, display: "flex", justifyContent: "space-between" }}>
          <div style={{ opacity: 0.7, fontSize: 12 }}>
            Use this to unlock the job via <code>/today/guest</code> (token + PIN).
          </div>
          <button onClick={onClose} style={primaryBtn()}>
            Done
          </button>
        </footer>
      </div>
    </div>,
    document.body
  );
}

/* ---------- styles ---------- */
function chipBtn(): React.CSSProperties {
  return {
    height: 34,
    padding: "0 12px",
    borderRadius: 10,
    border: `1px solid ${theme?.colors?.panelBorder ?? "rgba(255,255,255,0.12)"}`,
    background: "rgba(255,255,255,0.05)",
    color: theme?.colors?.text ?? "#e8eef6",
    fontWeight: 800,
  };
}
function inputStyle(): React.CSSProperties {
  return {
    height: 36,
    padding: "0 10px",
    borderRadius: 10,
    border: `1px solid ${theme?.colors?.panelBorder ?? "rgba(255,255,255,0.12)"}`,
    background: "rgba(0,0,0,0.35)",
    color: theme?.colors?.text ?? "#e8eef6",
  };
}
function primaryBtn(): React.CSSProperties {
  return {
    height: 36,
    padding: "0 14px",
    borderRadius: 10,
    border: "none",
    background: theme?.colors?.accent ?? "#3b82f6",
    color: "#0c1116",
    fontWeight: 900,
  };
}
