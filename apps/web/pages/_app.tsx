// pages/_app.tsx - Enhanced for v2025-09-19 Specification Compliance
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useRouter } from "next/router";
import Script from "next/script";
import React from "react";

import AccessibilityProvider from "@/components/AccessibilityProvider";
import Sidebar from "@/components/Sidebar"; // Replaces AppNav
import HeaderTrigger from "@/components/HeaderTrigger";
// import AppNav from "@/components/AppNav"; // Deprecated
import { ErrorBoundary } from "@/components/ErrorBoundary";
import TaskBanner from "@/components/TaskBanner";
import { AuthProvider } from "@/lib/AuthProvider";
import "@/styles/globals.css";

// Dynamically import performance and monitoring components
const PerformanceMonitor = dynamic(() => import("@/components/PerformanceMonitor"), { ssr: false });

// Initialize security service
// TEMPORARILY DISABLED - blocking authentication requests
// import "@/lib/securityService";

export default function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  // Define routes that should have a clean layout (no nav/banners)
  const isPublicRoute = ['/login', '/reset-password'].includes(router.pathname);

  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <AuthProvider>
          <Head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <title>BHIT OS</title>

            {/* Security Headers - Note: These should be server headers in production */}
            <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />

            {/* PWA Manifest */}
            <link rel="manifest" href="/manifest.json" />

            {/* Preconnect to external domains */}
            <link rel="preconnect" href="https://cdnjs.cloudflare.com" />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
          </Head>

          {/* Scripts that can load lazily - beforeInteractive scripts moved to _document.tsx */}
          <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js" strategy="lazyOnload" />

          <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            overflowX: 'hidden'
          }}>
            {/* 
              LAYOUT STRUCTURE:
              1. TaskBanner: Relative flow, sits at very top. Pushes everything down.
              2. HeaderTrigger: Sticky top-left.
              3. Sidebar: Fixed overlay.
            */}

            {!isPublicRoute && (
              <>
                {/* Banner sits in flow, pushes content down */}
                <TaskBanner />

                {/* Trigger is now Fixed, so it floats over everything */}
                <HeaderTrigger onOpen={() => setIsSidebarOpen(true)} />

                {/* Fixed Overlay Drawer */}
                <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
              </>
            )}

            <main
              id="main-content"
              style={{
                flex: 1,
                padding: isPublicRoute ? 0 : '16px',
                width: '100%',
                // If the trigger is 40px + 16px padding = ~56px height, we might want to ensure content 
                // doesn't hide behind it IF the content flows there. 
                // But since HeaderTrigger is sticky and pointer-events:none wrapper, 
                // it just floats over. We might want a small top margin if it overlaps critical UI.
                // For now, standard padding is usually sufficient.
                overflowX: 'hidden',
                boxSizing: 'border-box'
              }}
            >
              <Component {...pageProps} />
            </main>
          </div>

          {/* Performance Monitor for development */}
          <PerformanceMonitor
            enabled={process.env.NODE_ENV === 'development'}
            showOverlay={process.env.NODE_ENV === 'development'}
          />
        </AuthProvider>
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}
