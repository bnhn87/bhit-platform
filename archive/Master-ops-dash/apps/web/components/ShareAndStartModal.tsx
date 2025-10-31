// apps/web/components/ShareAndStartModal.tsx
import { useEffect, useState } from "react";
import { panelStyle, theme } from "../lib/theme";

type Props = {
  jobId: string;
  jobTitle?: string;
  open: boolean;
  onClose: () => void;
};

export default function ShareAndStartModal({ jobId, jobTitle, open, onClose }: Props) {
  const [pin, setPin] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPin("");
      setToken(null);
      setShareUrl(null);
      setBusy(false);
      setMsg(null);
      setErr(null);
    }
  }, [open]);

  if (!open) return null;

  async function createShare() {
    setErr(null); setMsg(null); setBusy(true);
    try {
      const res = await fetch("/api/jobs/create-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, pin: pin || undefined, hoursValid: 24 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create share");
      setToken(json.token);
      setShareUrl(json.shareUrl);
      setPin(json.pin); // server can override to a valid 4-digit
      setMsg("Share link created");
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  async function startJob() {
    setErr(null); setMsg(null); setBusy(true);
    try {
      const res = await fetch("/api/jobs/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, pin }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to start job");
      setMsg(`Job "${json.job.title}" started`);
    } catch (e: any) {
      setErr(e.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => setMsg("Copied"));
  }

  return (
    <div style={screen}>
      <div style={{ ...panelStyle, width: 560, maxWidth: "96vw", padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Share & Start</div>
          <div style={{ marginLeft: "auto" }}>
            <button onClick={onClose} style={btn({ background: theme.colors.panelBorder })}>Close</button>
          </div>
        </div>

        {jobTitle && <div style={{ color: theme.colors.subtext, marginTop: 6 }}>{jobTitle}</div>}

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12, color: theme.colors.subtext, marginBottom: 6 }}>Supervisor PIN (4 digits)</div>
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            placeholder="1234"
            style={input({ width: 120 })}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button disabled={busy} onClick={createShare} style={btnPrimary()}>Generate Link</button>
          <button disabled={busy || !pin} onClick={startJob} style={btn({ background: theme.colors.accent, color: "#fff" })}>Start Job</button>
        </div>

        {shareUrl && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, color: theme.colors.subtext, marginBottom: 6 }}>Guest link (valid 24h)</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={shareUrl} readOnly style={input({ flex: 1 })} />
              <button onClick={() => copy(shareUrl)} style={btn()}>Copy</button>
            </div>
          </div>
        )}

        {(msg || err) && (
          <div style={{ marginTop: 12, color: err ? theme.colors.danger : theme.colors.subtext }}>{err || msg}</div>
        )}
      </div>
    </div>
  );
}

/* styles */
const screen: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
};
function input(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${theme.colors.panelBorder}`,
    background: "#111823",
    color: theme.colors.text,
    ...extra,
  };
}
function btn(extra?: React.CSSProperties): React.CSSProperties {
  return { padding: "10px 12px", borderRadius: 10, border: 0, color: theme.colors.text, cursor: "pointer", ...extra };
}
function btnPrimary(): React.CSSProperties { return btn({ background: theme.colors.brand || theme.colors.accent, color: "#fff", fontWeight: 700 }); }
