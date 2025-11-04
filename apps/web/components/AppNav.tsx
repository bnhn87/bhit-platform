// apps/web/components/AppNav.tsx
import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { useHasInvoiceAccess } from "@/hooks/useHasInvoiceAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { UserRole } from "@/lib/roles";
import { supabase } from "@/lib/supabaseClient";

/**
 * LEFT CLUSTER = core links (always visible, no flicker, never duplicated)
 * RIGHT CLUSTER = role EXTRAS only (no Dashboard/Today/Jobs/Clients here)
 */
const EXTRAS_BY_ROLE: Record<UserRole, { label: string; href: string }[]> = {
  guest: [],
  installer: [],
  supervisor: [
    { label: "Progress", href: "/construction-progress" }
  ],
  ops: [
    { label: "POD Manager", href: "/pods" },
    { label: "Progress", href: "/construction-progress" },
    { label: "Smart Quote", href: "/smart-quote" },
    { label: "SmartInvoice", href: "/smart-invoice" },
    { label: "Settings", href: "/settings" }
  ],
  director: [
    { label: "POD Manager", href: "/pods" },
    { label: "Progress", href: "/construction-progress" },
    { label: "Smart Quote", href: "/smart-quote" },
    { label: "SmartInvoice", href: "/smart-invoice" },
    { label: "Invoice Schedule", href: "/invoicing/schedule" },
    { label: "Admin Panel", href: "/admin-panel" },
    { label: "Costing", href: "/admin/costing" },
    { label: "Users", href: "/admin/user-management" },
    { label: "Settings", href: "/settings" }
  ],
  admin: [
    { label: "POD Manager", href: "/pods" },
    { label: "Progress", href: "/construction-progress" },
    { label: "Smart Quote", href: "/smart-quote" },
    { label: "SmartInvoice", href: "/smart-invoice" },
    { label: "Admin Panel", href: "/admin-panel" },
    { label: "Costing", href: "/admin/costing" },
    { label: "Users", href: "/admin/user-management" },
    { label: "Settings", href: "/settings" }
  ]
};

// iOS 29 - Clean & Modern with Shimmer
// Note: top position is dynamic and set via inline style based on banner presence
const bar: React.CSSProperties = {
  position: "fixed",
  // top is set dynamically via inline style
  left: 0,
  right: 0,
  zIndex: 999, // Lower than TaskBanner (9999) so banner is always on top
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 20px",

  // Clean background
  background: "rgba(11, 17, 24, 0.85)",
  backdropFilter: "blur(16px) saturate(180%)",
  WebkitBackdropFilter: "blur(16px) saturate(180%)",

  borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)"
};

const brand: React.CSSProperties = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', system-ui, sans-serif",
  fontWeight: 900,
  fontSize: 16,
  letterSpacing: -0.3,
  color: "#ffffff",
  textDecoration: "none",
  transition: "all 0.2s ease"
};

const group: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap"
};

const pill: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 12,
  background: "linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%)",
  border: "none",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 600,
  letterSpacing: -0.2,
  fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  boxShadow: "inset 0 0.5px 1px rgba(255, 255, 255, 0.1), 0 1px 2px rgba(0, 0, 0, 0.15)"
};

const pillActive: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 12,
  background: "linear-gradient(135deg, #3da3ff 0%, #1d91ff 100%)",
  border: "none",
  color: "#ffffff",
  textDecoration: "none",
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: -0.2,
  fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  position: "relative",
  overflow: "hidden",
  boxShadow: "inset 0 0.5px 1px rgba(255, 255, 255, 0.25), 0 2px 8px rgba(29, 145, 255, 0.3)"
};

const roleBadge: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  background: "rgba(125, 211, 252, 0.12)",
  border: "1px solid rgba(125, 211, 252, 0.25)",
  color: "#7dd3fc",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: 0.5,
  fontFamily: "-apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  textTransform: "uppercase",
  transition: "all 0.2s ease"
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
  const [isHovered, setIsHovered] = React.useState(false);

  const baseStyle = active ? pillActive : pill;

  const hoverStyle: React.CSSProperties = !active && isHovered ? {
    ...pill,
    background: `
      linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%),
      rgba(255, 255, 255, 0.05)
    `,
    border: "1px solid rgba(255, 255, 255, 0.2)",
    boxShadow: `
      inset 0 1px 1px rgba(255, 255, 255, 0.1),
      0 4px 8px rgba(0, 0, 0, 0.15),
      0 0 20px rgba(125, 211, 252, 0.08)
    `,
    transform: "translateY(-1px)"
  } : {};

  return (
    <Link
      href={href}
      className={`nav-pill ${active ? 'active' : ''}`}
      style={{ ...baseStyle, ...hoverStyle }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="nav-pill-text">{label}</span>
    </Link>
  );
}

export default function AppNav() {
  const { role, loading } = useUserRole();
  const { hasAccess: hasInvoiceAccess, loading: invoiceLoading } = useHasInvoiceAccess();
  const r = useRouter();
  const [bannerHeight, setBannerHeight] = React.useState(0);

  // Detect banner height on mount and resize
  React.useEffect(() => {
    const updateBannerHeight = () => {
      const banner = document.querySelector('.task-banner') as HTMLElement;
      if (banner) {
        const height = banner.offsetHeight;
        console.log('[AppNav] Banner height detected:', height);
        setBannerHeight(height);
      } else {
        console.log('[AppNav] No banner found, setting height to 0');
        setBannerHeight(0);
      }
    };

    // Aggressive multi-attempt detection
    updateBannerHeight(); // Immediate
    const timeout1 = setTimeout(updateBannerHeight, 50);   // 50ms
    const timeout2 = setTimeout(updateBannerHeight, 100);  // 100ms
    const timeout3 = setTimeout(updateBannerHeight, 250);  // 250ms
    const timeout4 = setTimeout(updateBannerHeight, 500);  // 500ms

    // Update on window resize
    window.addEventListener('resize', updateBannerHeight);

    // Use MutationObserver to detect banner changes
    const observer = new MutationObserver(updateBannerHeight);
    // Observer will be set up after a delay to ensure banner exists
    const observerTimeout = setTimeout(() => {
      const banner = document.querySelector('.task-banner');
      if (banner) {
        observer.observe(banner, { attributes: true, childList: true, subtree: true });
      }
    }, 100);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearTimeout(timeout3);
      clearTimeout(timeout4);
      clearTimeout(observerTimeout);
      window.removeEventListener('resize', updateBannerHeight);
      observer.disconnect();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <>
      <style>{`
        @keyframes pulse { 0% {background-position: 0% 0%} 100% {background-position: -200% 0%} }

        @keyframes navShimmer {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        /* Shimmer effect on hover - hidden by default */
        .nav-pill::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.3),
            transparent
          );
          pointer-events: none;
          z-index: 1;
          transition: left 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Trigger shimmer on hover */
        .nav-pill:hover::before {
          left: 100%;
        }

        /* Active pills get slower shimmer */
        .nav-pill.active::before {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.4),
            transparent
          );
          transition: left 0.9s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Text lights up on hover and active state */
        .nav-pill .nav-pill-text {
          position: relative;
          z-index: 2;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .nav-pill:hover .nav-pill-text,
        .nav-pill:active .nav-pill-text,
        .nav-pill.active .nav-pill-text {
          filter: brightness(1.3) drop-shadow(0 0 8px rgba(255, 255, 255, 0.5));
        }

        @media (max-width: 900px) { main { padding-top: 8px } }
      `}</style>
      <nav style={{ ...bar, top: `${bannerHeight}px` }}>
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
          {loading || invoiceLoading ? (
            <>
              <span style={pill}><Skeleton w={90} /></span>
              <span style={pill}><Skeleton w={80} /></span>
              <span style={pill}><Skeleton w={70} /></span>
            </>
          ) : (
            <>
              {/* Role-based extras */}
              {(EXTRAS_BY_ROLE[role] || []).map((it) => (
                <NavLink
                  key={it.href}
                  href={it.href}
                  label={it.label}
                  active={r.pathname === it.href || r.asPath === it.href || r.pathname.startsWith(it.href)}
                />
              ))}

              {/* Dynamic invoice access for non-directors */}
              {role !== 'director' && hasInvoiceAccess && (
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
                <Link href="/login" className="nav-pill" style={pill}>
                  <span className="nav-pill-text">Sign in</span>
                </Link>
              ) : (
                <button onClick={signOut} className="nav-pill" style={{ ...pill, cursor: "pointer", border: "1px solid #2b3542" }}>
                  <span className="nav-pill-text">Sign out</span>
                </button>
              )}
            </>
          )}
        </div>
      </nav>
    </>
  );
}