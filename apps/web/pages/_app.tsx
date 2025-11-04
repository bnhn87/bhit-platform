// pages/_app.tsx - Enhanced for v2025-09-19 Specification Compliance
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import Head from "next/head";
import Script from "next/script";
import React from "react";

import AccessibilityProvider from "@/components/AccessibilityProvider";
import AppNav from "@/components/AppNav";
import TaskBanner from "@/components/TaskBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/lib/AuthProvider";
import "@/styles/globals.css";

// Dynamically import performance and monitoring components
const PerformanceMonitor = dynamic(() => import("@/components/PerformanceMonitor"), { ssr: false });

// Initialize security service
import "@/lib/securityService";

export default function MyApp({ Component, pageProps }: AppProps) {
  const [topOffset, setTopOffset] = React.useState(0);

  React.useEffect(() => {
    const updateTopOffset = () => {
      const banner = document.querySelector('.task-banner') as HTMLElement;
      const nav = document.querySelector('nav') as HTMLElement;
      const bannerHeight = banner ? banner.offsetHeight : 0;
      const navHeight = nav ? nav.offsetHeight : 0;
      setTopOffset(bannerHeight + navHeight);
    };

    // Update on mount
    updateTopOffset();

    // Update on window resize
    window.addEventListener('resize', updateTopOffset);

    // Update when banner changes
    const observer = new MutationObserver(updateTopOffset);
    const banner = document.querySelector('.task-banner');
    if (banner) {
      observer.observe(banner, { attributes: true, childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener('resize', updateTopOffset);
      observer.disconnect();
    };
  }, []);

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
            <TaskBanner /> {/* Task Banner ABOVE navbar */}
            <AppNav />
            <main
              id="main-content"
              style={{
                flex: 1,
                padding: '16px',
                paddingTop: Math.max(16, topOffset + 16), // Add top padding for banner + navbar
                width: '100%',
                maxWidth: '100vw',
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
