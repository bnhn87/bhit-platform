import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";

import { useUserRole } from "../hooks/useUserRole";
import { UserRole } from "../lib/roles";
import { supabase } from "../lib/supabaseClient";
import { theme } from "../lib/theme";

type DbUserRow = { role?: UserRole | string | null };

async function getRoleForUser(): Promise<UserRole> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return "guest";
  const { data, error } = await supabase.from("users").select("role").eq("id", uid).maybeSingle<DbUserRow>();
  if (error) {
    // Role fetch error
    return "guest";
  }
  const raw = (data?.role || "").toString().toLowerCase();
  if (raw === "supervisor" || raw === "ops" || raw === "director" || raw === "installer" || raw === "admin") return raw as UserRole;
  return "guest";
}

const EXTRAS_BY_ROLE: Record<UserRole, { label: string; href: string }[]> = {
  guest: [],
  installer: [],
  supervisor: [],
  ops: [
    { label: "Smart Quote", href: "/smart-quote" },
    { label: "SmartInvoice", href: "/smart-invoice" },
    { label: "Floor Planner", href: "/floor-planner" },
    { label: "Settings", href: "/settings" }
  ],
  director: [
    { label: "Smart Quote", href: "/smart-quote" },
    { label: "SmartInvoice", href: "/smart-invoice" },
    { label: "Floor Planner", href: "/floor-planner" },
    { label: "Admin Panel", href: "/admin-panel" },
    { label: "Costing", href: "/admin/costing" },
    { label: "Settings", href: "/settings" }
  ],
  admin: [
    { label: "Smart Quote", href: "/smart-quote" },
    { label: "SmartInvoice", href: "/smart-invoice" },
    { label: "Floor Planner", href: "/floor-planner" },
    { label: "Admin Panel", href: "/admin-panel" },
    { label: "Costing", href: "/admin/costing" },
    { label: "Settings", href: "/settings" }
  ]
};

export default function NavBar() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState<UserRole>("guest");
  const { role: _userRole, loading: _loading } = useUserRole();

  useEffect(() => {
    let alive = true;
    (async () => {
      try { 
        const r = await getRoleForUser(); 
        if (!alive) return; 
        setRole(r); 
      }
      finally { 
        if (alive) setReady(true); 
      }
    })();
    return () => { alive = false; };
  }, []);

  const items = useMemo(() => EXTRAS_BY_ROLE[role], [role]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div style={{
      position:"sticky", top:0, zIndex:50, display:"flex", alignItems:"center", gap:12,
      padding:"12px 16px", background: theme.colors.bg, borderBottom:`1px solid ${theme.colors.border}`
    }}>
      <div style={{ fontWeight:700, color: theme.colors.text }}>BHIT Work OS</div>
      <nav style={{ display:"flex", gap:10, marginLeft:16 }}>
        {(ready ? items : new Array(4).fill(null)).map((it, idx) =>
          ready ? (
            <Link
              key={it.href}
              href={it.href}
              style={{
                padding:"8px 12px", borderRadius: theme.radii.sm,
                border:`1px solid ${theme.colors.border}`, color: theme.colors.text, textDecoration:"none"
              }}
            >
              {it.label}
            </Link>
          ) : (
            <span key={idx} style={{
              width:96, height:34, borderRadius: theme.radii.sm,
              background: theme.colors.muted, display:"inline-block", opacity:0.5
            }} />
          )
        )}
      </nav>
      <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
        <button onClick={() => router.push("/jobs")} style={{
          padding:"8px 12px", borderRadius: theme.radii.sm, border:`1px solid ${theme.colors.border}`,
          background: theme.colors.panel, color: theme.colors.text, cursor:"pointer"
        }}>Jobs</button>
        <button onClick={signOut} aria-label="Sign out" style={{
          padding:"8px 12px", borderRadius: theme.radii.sm, border:`1px solid ${theme.colors.border}`,
          background: theme.colors.panelAlt, color: theme.colors.textSubtle, cursor:"pointer"
        }}>Sign out</button>
      </div>
    </div>
  );
}