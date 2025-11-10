import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { supabase } from "../lib/supabaseClient";

export default function Index() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data?.session) {
        router.replace("/dashboard");
      } else {
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, [router]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/dashboard");
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0e141b", color: "#e8eef6", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 12 }}>BHIT Work OS</div>
          <div style={{ color: "#9fb2c8" }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0e141b", color: "#e8eef6" }}>
      <div style={{ maxWidth: 360, margin: "80px auto", padding: 24, border: "1px solid #1d2733", borderRadius: 12, background: "#121a23" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 28 }}>BHIT Work OS</h1>
          <p style={{ color: "#9fb2c8", fontSize: 14, margin: 0 }}>Sign in to continue</p>
        </div>

        <form onSubmit={handleSignIn} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #1d2733", background: "#0b1117", color: "#e8eef6" }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid #1d2733", background: "#0b1117", color: "#e8eef6" }}
            />
          </label>
          {error && <div style={{ color: "#ef4444", fontSize: 14 }}>{error}</div>}
          <button
            type="submit"
            disabled={busy}
            style={{
              padding: "10px 12px",
              borderRadius: 8,
              border: "1px solid #1d2733",
              background: busy ? "#223041" : "#3b82f6",
              color: "#fff",
              cursor: busy ? "not-allowed" : "pointer",
              fontWeight: 600
            }}
          >
            {busy ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
