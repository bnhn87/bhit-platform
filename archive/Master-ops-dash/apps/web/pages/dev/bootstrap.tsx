// apps/web/pages/dev/bootstrap.tsx
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { panelStyle, theme } from "../../lib/theme";

export default function Bootstrap() {
  const [msg, setMsg] = useState<string>("Working…");

  useEffect(() => {
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) { setMsg("Sign in first at /login."); return; }

      // Create your users row with email (safe/idempotent)
      const email = auth.user.email || null;
      await supabase.rpc("upsert_user_self", { p_email: email, p_role: null });

      // Promote if no director exists yet
      const { data, error } = await supabase.rpc("bootstrap_director");
      if (error) { setMsg(error.message); return; }
      setMsg(data ? "You are now director." : "A director already exists. Your role remains unchanged.");
    })();
  }, []);

  return (
    <div style={{ ...panelStyle, padding: 16, marginTop: 20 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: theme.colors.text }}>Bootstrap Director</div>
      <div style={{ color: theme.colors.subtext }}>{msg}</div>
    </div>
  );
}
