// apps/web/components/AppNav.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/lib/theme";

type Role = "guest" | "installer" | "ops" | "director" | "admin";

/**
 * LEFT CLUSTER = core links (always visible, no flicker, never duplicated)
 * RIGHT CLUSTER = role EXTRAS only (no Dashboard/Today/Jobs/Clients here)
 */
const EXTRAS_BY_ROLE: Record<Role, { label: string; href: string }[]> = {
  guest: [],
  installer: [],
  ops: [
    { label: "Smart Quote", href: "/smart-quote" },
    { label: "Settings", href: "/settings" }
  ],
  director: [
    { label: "Smart Quote", href: "/smart-quote" },
    { label: "Admin Panel", href: "/admin-panel" },
    { label: "Costing", href: "/admin/costing" },
    { label: "Settings", href: "/settings" }
  ],
  admin: [
    { label: "Smart Quote", href: "/smart-quote" },
    { label: "Admin Panel", href: "/admin-panel" },
    { label: "Costing", href: "/admin/costing" },
    { label: "Settings", href: "/settings" }
  ]
};

const bar: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "10px 16px",
  background: theme.colors.panelAlt,
  borderBottom: `1px solid ${theme.colors.border}`
};

const brand: React.CSSProperties = {
  fontWeight: 900,
  letterSpacing: 0.4,
  color: theme.colors.text,
  textDecoration: "none"
};

const group: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap"
};

const pill: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: theme.radii.sm,
  background: theme.colors.panel,
  border: `1px solid ${theme.colors.border}`,
  color: theme.colors.text,
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 700
};

const pillActive: React.CSSProperties = {
  ...pill,
  background: theme.colors.accent,
  color: "#fff",
  boxShadow: "0 6px 16px rgba(29,145,255,0.25)"
};

const roleBadge: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: theme.colors.muted,
  border: `1px solid ${theme.colors.border}`,
  color: theme.colors.text,
  fontSize: 12,
  fontWeight: 800
};

function Skeleton({ w = 64 }: { w?: number }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: w,
        height: 14,
        borderRadius: 7,
        background: "linear-gradient(90deg, #0f151c, #14202b, #0f151c)",
        backgroundSize: "200% 100%",
        animation: "pulse 1.2s ease-in-out infinite"
      }}
    />
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} style={active ? pillActive : pill}>
      {label}
    </Link>
  );
}

export default function AppNav() {
  const { role, loading } = useUserRole();
  const r = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      <style>{`
        @keyframes pulse { 0% {background-position: 0% 0%} 100% {background-position: -200% 0%} }
        @media (max-width: 900px) { main { padding-top: 8px } }
      `}</style>
      <nav style={bar}>
        <Link href="/dashboard" style={brand}>BHIT&nbsp;OS</Link>

        {/* LEFT: core links (never duplicated) */}
        <div style={{ ...group, marginLeft: 8 }}>
          <NavLink href="/dashboard" label="Dashboard" active={r.pathname === "/dashboard"} />
          <NavLink href="/today" label="Today" active={r.pathname.startsWith("/today")} />
          <NavLink
            href="/jobs"
            label="Jobs"
            active={r.pathname.startsWith("/jobs") || r.pathname.startsWith("/job")}
          />
          <NavLink href="/clients" label="Clients" active={r.pathname.startsWith("/clients")} />
        </div>

        {/* RIGHT: extras + auth */}
        <div style={{ marginLeft: "auto", ...group }}>
          {loading ? (
            <>
              <span style={pill}><Skeleton w={90} /></span>
              <span style={pill}><Skeleton w={80} /></span>
              <span style={pill}><Skeleton w={70} /></span>
            </>
          ) : (
            <>
              {(EXTRAS_BY_ROLE[role] || []).map((it) => (
                <NavLink
                  key={it.href}
                  href={it.href}
                  label={it.label}
                  active={r.pathname === it.href || r.asPath === it.href}
                />
              ))}

              {/* Role badge */}
              <span style={roleBadge}>{role.toUpperCase()}</span>

              {/* Auth control */}
              {role === "guest" ? (
                <Link href="/login" style={pill}>Sign in</Link>
              ) : (
                <button onClick={signOut} style={{ ...pill, cursor: "pointer", border: `1px solid ${theme.colors.border}` }}>
                  Sign out
                </button>
              )}
            </>
          )}
        </div>
      </nav>
    </>
  );
}