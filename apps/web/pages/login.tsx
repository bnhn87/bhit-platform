/**
 * Clean login for BHIT Work OS.
 * - Redirects to /dashboard on success
 * - Shows "signed in" state with buttons
 */
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { getSiteUrl } from "../lib/utils/url";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [view, setView] = useState<'signin' | 'forgot_password'>('signin');

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (data.session) setSignedIn(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!alive) return;
      setSignedIn(!!session);
    });
    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim()
    });
    setBusy(false);
    if (error) { setError(error.message); return; }
    router.replace("/dashboard");
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccessMsg(null);

    const redirectTo = `${getSiteUrl()}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setBusy(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccessMsg("Check your email for the password reset link.");
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setSignedIn(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0e141b", color: "#e8eef6", display: "flex", flexDirection: "column", alignItems: "center", padding: "0 16px" }}>
      <div style={{
        maxWidth: 360,
        width: "100%",
        margin: "clamp(40px, 10vh, 80px) auto",
        padding: 24,
        border: "1px solid #1d2733",
        borderRadius: 12,
        background: "#121a23"
      }}>
        <h1 style={{ marginTop: 0, marginBottom: 12 }}>Sign In</h1>

        {signedIn ? (
          <>
            <p>You are signed in.</p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => router.push("/dashboard")}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #1d2733", background: "#0b1117", color: "#e8eef6", cursor: "pointer" }}>
                Go to Dashboard
              </button>
              <button onClick={handleSignOut}
                style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #1d2733", background: "#0b1117", color: "#9fb2c8", cursor: "pointer" }}>
                Sign out
              </button>
            </div>
          </>
        ) : view === 'forgot_password' ? (
          <form onSubmit={handleResetPassword} style={{ display: "grid", gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: "#9fb2c8" }}>
              Enter your email to receive a password reset link.
            </p>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Email</span>
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #1d2733", background: "#0b1117", color: "#e8eef6" }} />
            </label>
            {error && <div style={{ color: "#ef4444", fontSize: 14 }}>{error}</div>}
            {successMsg && <div style={{ color: "#4ade80", fontSize: 14 }}>{successMsg}</div>}

            <button type="submit" disabled={busy}
              style={{
                padding: "10px 12px", borderRadius: 8, border: "1px solid #1d2733",
                background: busy ? "#223041" : "#3b82f6", color: "#fff", cursor: busy ? "not-allowed" : "pointer", fontWeight: 600
              }}>
              {busy ? "Sending..." : "Send Reset Link"}
            </button>
            <button type="button" onClick={() => { setView('signin'); setError(null); setSuccessMsg(null); }}
              style={{ background: "transparent", border: "none", color: "#9fb2c8", cursor: "pointer", fontSize: 14, textDecoration: "underline" }}>
              Back to Sign In
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignIn} style={{ display: "grid", gap: 12 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Email</span>
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #1d2733", background: "#0b1117", color: "#e8eef6" }} />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Password</span>
              <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required
                style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #1d2733", background: "#0b1117", color: "#e8eef6" }} />
            </label>
            {error && <div style={{ color: "#ef4444", fontSize: 14 }}>{error}</div>}
            <button type="submit" disabled={busy}
              style={{
                padding: "10px 12px", borderRadius: 8, border: "1px solid #1d2733",
                background: busy ? "#223041" : "#3b82f6", color: "#fff", cursor: busy ? "not-allowed" : "pointer", fontWeight: 600
              }}>
              {busy ? "Signing in..." : "Sign In"}
            </button>
            <button type="button" onClick={() => { setView('forgot_password'); setError(null); }}
              style={{ background: "transparent", border: "none", color: "#9fb2c8", cursor: "pointer", fontSize: 14, textAlign: "right" }}>
              Forgot Password?
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
