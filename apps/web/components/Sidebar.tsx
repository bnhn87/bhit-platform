import Link from "next/link";
import { useRouter } from "next/router";
import React, { useEffect, useRef } from "react";
import { X, LogOut } from "lucide-react"; // Assuming lucide-react is available as it was used in TaskBanner

import { getCoreNavItems, getNavItemsForRole } from "@/config/navigation";
import { useHasInvoiceAccess } from "@/hooks/useHasInvoiceAccess";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/lib/supabaseClient";

/**
 * Sidebar Navigation Component
 * Replaces the top AppNav with a premium glassmorphic drawer.
 */

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const { role, loading } = useUserRole();
    const { hasAccess: hasInvoiceAccess, loading: invoiceLoading } = useHasInvoiceAccess();
    const router = useRouter();
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Close on route change
    useEffect(() => {
        const handleRouteChange = () => {
            onClose();
        };
        router.events.on('routeChangeStart', handleRouteChange);
        return () => {
            router.events.off('routeChangeStart', handleRouteChange);
        };
    }, [router, onClose]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isOpen &&
                sidebarRef.current &&
                !sidebarRef.current.contains(event.target as Node)
            ) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Get navigation items
    const coreItems = getCoreNavItems();
    const roleItems = getNavItemsForRole(role);

    async function signOut() {
        await supabase.auth.signOut();
        window.location.href = "/login";
    }

    // Styles
    const overlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 9998,
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? 'auto' : 'none',
        transition: 'opacity 0.3s ease',
    };

    const drawerStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '280px',
        backgroundColor: 'rgba(11, 17, 24, 0.95)', // Deep dark blue/black
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        zIndex: 9999,
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '4px 0 24px rgba(0,0,0,0.5)',
    };

    const headerStyle: React.CSSProperties = {
        padding: '24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    };

    const brandStyle: React.CSSProperties = {
        fontSize: '20px',
        fontWeight: 900,
        letterSpacing: '1px',
        color: '#e8eef6',
        textDecoration: 'none',
    };

    const linkBaseStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        margin: '4px 12px',
        borderRadius: '12px',
        color: '#94a3b8',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: 500,
        transition: 'all 0.2s ease',
    };

    const activeLinkStyle: React.CSSProperties = {
        ...linkBaseStyle,
        backgroundColor: 'rgba(29, 145, 255, 0.1)',
        color: '#3b82f6',
        fontWeight: 600,
    };

    const sectionLabelStyle: React.CSSProperties = {
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        color: '#64748b',
        padding: '24px 24px 8px',
        fontWeight: 700,
    };

    return (
        <>
            {/* Backdrop Overlay */}
            <div style={overlayStyle} aria-hidden="true" />

            {/* Drawer */}
            <nav ref={sidebarRef} style={drawerStyle}>
                <div style={headerStyle}>
                    <Link href="/dashboard" style={brandStyle}>
                        BHIT OS
                    </Link>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: 4,
                        }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 20 }}>
                    {/* CORE NAVIGATION */}
                    <div style={sectionLabelStyle}>Menu</div>
                    {coreItems.map((item) => {
                        const isActive = router.pathname === item.href ||
                            (item.href !== '/dashboard' && router.pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.id}
                                href={item.href}
                                style={isActive ? activeLinkStyle : linkBaseStyle}
                            >
                                {item.label}
                            </Link>
                        );
                    })}

                    {/* ROLE BASED NAVIGATION */}
                    {(loading || invoiceLoading) ? (
                        <div style={{ padding: 24, color: '#64748b', fontSize: 13 }}>Loading access...</div>
                    ) : (
                        <>
                            {roleItems.length > 0 && <div style={sectionLabelStyle}>Workspace</div>}
                            {roleItems.map((item) => {
                                const isActive = router.pathname === item.href || router.asPath === item.href;
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        style={isActive ? activeLinkStyle : linkBaseStyle}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}

                            {/* Special Invoice Access */}
                            {role !== 'director' && role !== 'admin' && hasInvoiceAccess && (
                                <Link
                                    href="/invoicing/schedule"
                                    style={router.pathname.startsWith("/invoicing") ? activeLinkStyle : linkBaseStyle}
                                >
                                    Invoice Schedule
                                </Link>
                            )}
                        </>
                    )}
                </div>

                {/* FOOTER */}
                <div style={{
                    padding: '16px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    backgroundColor: 'rgba(0,0,0,0.2)'
                }}>
                    {!loading && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, padding: '0 12px' }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '50%',
                                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 12, fontWeight: 'bold', color: 'white'
                            }}>
                                {role.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 14, color: '#e8eef6', fontWeight: 500, textTransform: 'capitalize' }}>
                                    {role} Account
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={signOut}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            padding: '10px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(255, 59, 48, 0.1)',
                            border: '1px solid rgba(255, 59, 48, 0.2)',
                            color: '#ff4d4d',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </nav>
        </>
    );
}
