// apps/web/components/AppNav.tsx
import Link from "next/link";
import { useRouter } from "next/router";

import { useHasInvoiceAccess } from "@/hooks/useHasInvoiceAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabaseClient";
import { getCoreNavItems, getNavItemsForRole } from "@/config/navigation";

/**
 * Dynamic Navigation Bar
 * All links are configured in config/navigation.ts
 * Numbers in labels make it easy to disable/remove specific links
 */

const bar: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 50,
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "10px 16px",
  background: "#0b1118",
  borderBottom: "1px solid #1d2733"
};

const brand: React.CSSProperties = {
  fontWeight: 900,
  letterSpacing: 0.4,
  color: "#e8eef6",
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
  borderRadius: 10,
  background: "#0f151c",
  border: "1px solid #1d2733",
  color: "#e8eef6",
  textDecoration: "none",
  fontSize: 13,
  fontWeight: 700
};

const pillActive: React.CSSProperties = {
  ...pill,
  background: "#1d91ff",
  color: "#fff",
  boxShadow: "0 6px 16px rgba(29,145,255,0.25)"
};

const roleBadge: React.CSSProperties = {
  padding: "6px 10px",
  borderRadius: 999,
  background: "#14202b",
  border: "1px solid #284054",
  color: "#cfe3ff",
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
  const { hasAccess: hasInvoiceAccess, loading: invoiceLoading } = useHasInvoiceAccess();
  const r = useRouter();

  // Get navigation items from centralized config
  const coreItems = getCoreNavItems();
  const roleItems = getNavItemsForRole(role);

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

        {/* LEFT: core links (configured in navigation.ts) */}
        <div style={{ ...group, marginLeft: 8 }}>
          {coreItems.map((item) => (
            <NavLink
              key={item.id}
              href={item.href}
              label={item.label}
              active={
                r.pathname === item.href ||
                r.pathname.startsWith(item.href + "/") ||
                (item.href === "/jobs" && r.pathname.startsWith("/job"))
              }
            />
          ))}
        </div>

        {/* RIGHT: role-based items + auth */}
        <div style={{ marginLeft: "auto", ...group }}>
          {loading || invoiceLoading ? (
            <>
              <span style={pill}><Skeleton w={90} /></span>
              <span style={pill}><Skeleton w={80} /></span>
              <span style={pill}><Skeleton w={70} /></span>
            </>
          ) : (
            <>
              {/* Role-based items from config */}
              {roleItems.map((item) => (
                <NavLink
                  key={item.id}
                  href={item.href}
                  label={item.label}
                  active={
                    r.pathname === item.href ||
                    r.asPath === item.href ||
                    r.pathname.startsWith(item.href + "/") ||
                    (item.href.includes("/invoicing") && r.pathname.startsWith("/invoicing"))
                  }
                />
              ))}

              {/* Dynamic invoice access for non-directors */}
              {role !== 'director' && role !== 'admin' && hasInvoiceAccess && (
                <NavLink
                  href="/invoicing/schedule"
                  label="Invoice Schedule"
                  active={r.pathname.startsWith("/invoicing")}
                />
              )}

              {/* Role badge */}
              <span style={roleBadge}>{role.toUpperCase()}</span>

              {/* Auth control */}
              {role === "guest" ? (
                <Link href="/login" style={pill}>Sign in</Link>
              ) : (
                <button onClick={signOut} style={{ ...pill, cursor: "pointer", border: "1px solid #2b3542" }}>
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