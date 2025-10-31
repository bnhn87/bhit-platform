/* eslint-disable react/no-unescaped-entities */
// apps/web/pages/dev/diag.tsx
import { useEffect, useState } from "react";

import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";

type X = { label: string; value: string | number | boolean | null };

export default function Diag() {
  const [rows, setRows] = useState<X[]>([{ label: "status", value: "loading" }]);

  useEffect(() => {
    (async () => {
      const out: X[] = [];
      out.push({ label: "NEXT_PUBLIC_SUPABASE_URL set", value: !!process.env.NEXT_PUBLIC_SUPABASE_URL });
      out.push({ label: "Anon key present", value: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });

      const { data: sessionData } = await supabase.auth.getSession();
      out.push({ label: "Has session", value: !!sessionData.session });
      out.push({ label: "User email", value: sessionData.session?.user?.email ?? null });
      out.push({ label: "User id", value: sessionData.session?.user?.id ?? null });

      // server role via RPC
      const { data: roleData, error: roleErr } = await supabase.rpc("get_my_role");
      out.push({ label: "get_my_role error", value: roleErr ? roleErr.message : false });
      out.push({ label: "Role", value: roleData ?? "n/a" });

      // can read users self?
      const { data: meRow, error: meErr } = await supabase.from("users").select("*").eq("id", sessionData.session?.user?.id || "00000000-0000-0000-0000-000000000000").maybeSingle();
      out.push({ label: "users self row error", value: meErr ? meErr.message : false });
      out.push({ label: "users self role", value: meRow?.role ?? "none" });

      // settings row
      const { data: sRow, error: sErr } = await supabase.from("org_settings").select("id,guest_enabled,guest_token_days").eq("id", 1).maybeSingle();
      out.push({ label: "org_settings read error", value: sErr ? sErr.message : false });
      out.push({ label: "guest_enabled", value: sRow?.guest_enabled ?? "n/a" });
      out.push({ label: "guest_token_days", value: sRow?.guest_token_days ?? "n/a" });

      setRows(out);
    })();
  }, []);

  return (
    <div style={{ padding: 16, marginTop: 20 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: theme.colors.text }}>Diagnostics</div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: `1px solid ${theme.colors.border}` }}>
              <td style={{ padding: "6px 8px", color: theme.colors.textSubtle, width: 260 }}>{r.label}</td>
              <td style={{ padding: "6px 8px" }}>
                <code style={{ color: theme.colors.text }}>{String(r.value)}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 10, fontSize: 12, color: theme.colors.textSubtle }}>
        If <strong>Has session</strong> is false, sign in at <code>/login</code>. If <strong>Role</strong> isn't "director",
        visit <code>/dev/bootstrap</code> once while signed in.
      </div>
    </div>
  );
}
