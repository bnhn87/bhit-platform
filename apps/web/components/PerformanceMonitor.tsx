/**
 * Performance Monitor - v2025-09-19 Specification Compliance
 * Tracks and optimizes application performance metrics
 */

import React, { useEffect, useState, useCallback } from 'react';

import { theme } from '../lib/theme';

interface PerformanceMetrics {
  // Core Web Vitals
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte

  // React-specific metrics
  renderTime?: number;
  componentCount?: number;
  memoryUsage?: number;

  // Custom metrics
  pageLoadTime?: number;
  apiResponseTimes?: Record<string, number>;
  errorRate?: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  showOverlay?: boolean;
  trackingId?: string;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export default function PerformanceMonitor({
  enabled = process.env.NODE_ENV === 'development',
  showOverlay = false,
  trackingId,
  onMetricsUpdate
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isVisible, setIsVisible] = useState(showOverlay);

  // Web Vitals measurement
  const measureWebVitals = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Performance Observer for Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as PerformanceEntry;
        if (lastEntry) {
          setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const fidEntry = entry as PerformanceEntry & { processingStart: number };
          setMetrics(prev => ({ ...prev, fid: fidEntry.processingStart - fidEntry.startTime }));
        });
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry) => {
          const clsEntry = entry as PerformanceEntry & { value: number; hadRecentInput: boolean };
          if (!clsEntry.hadRecentInput) {
            clsValue += clsEntry.value;
          }
        });
        setMetrics(prev => ({ ...prev, cls: clsValue }));
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // Navigation Timing
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0];
        setMetrics(prev => ({
          ...prev,
          ttfb: nav.responseStart - nav.requestStart,
          pageLoadTime: nav.loadEventEnd - nav.fetchStart
        }));
      }
    }
  }, [enabled]);

  // Memory usage tracking
  const trackMemoryUsage = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    if ('memory' in performance) {
      const memInfo = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory;
      if (memInfo?.usedJSHeapSize) {
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memInfo.usedJSHeapSize / 1024 / 1024 // Convert to MB
        }));
      }
    }
  }, [enabled]);

  // React render time tracking
  const trackRenderPerformance = useCallback(() => {
    if (!enabled) return;

    const startTime = performance.now();

    // Use requestAnimationFrame to measure after render
    requestAnimationFrame(() => {
      const renderTime = performance.now() - startTime;
      setMetrics(prev => ({
        ...prev,
        renderTime,
        componentCount: document.querySelectorAll('[data-reactroot] *').length
      }));
    });
  }, [enabled]);

  // API response time tracking
  const originalFetch = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        const url = typeof args[0] === 'string' ? args[0] :
                   (args[0] instanceof Request ? args[0].url :
                   (args[0] instanceof URL ? args[0].href : 'unknown'));
        setMetrics(prev => ({
          ...prev,
          apiResponseTimes: {
            ...prev.apiResponseTimes,
            [url]: duration
          }
        }));

        return response;
      } catch (error: unknown) {
        const _endTime = performance.now();

        setMetrics(prev => ({
          ...prev,
          errorRate: (prev.errorRate || 0) + 1
        }));

        throw error;
      }
    };
  }, [enabled]);

  // Send metrics to analytics
  const sendMetricsToAnalytics = useCallback((metrics: PerformanceMetrics) => {
    if (!trackingId || typeof window === 'undefined') return;

    // Send to analytics service (Google Analytics, Mixpanel, etc.)
    if ('gtag' in window) {
      (window as Window & { gtag?: (...args: unknown[]) => void }).gtag?.('event', 'performance_metrics', {
        event_category: 'Performance',
        lcp: metrics.lcp,
        fid: metrics.fid,
        cls: metrics.cls,
        custom_map: {
          metric_1: metrics.renderTime,
          metric_2: metrics.memoryUsage
        }
      });
    }

    // Send to custom analytics endpoint
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        trackingId,
        metrics,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href
      })
    }).catch(err => console.warn('Failed to send performance metrics:', err));
  }, [trackingId]);

  useEffect(() => {
    if (!enabled) return;

    measureWebVitals();
    trackMemoryUsage();
    trackRenderPerformance();
    originalFetch();

    // Set up periodic measurements
    const interval = setInterval(() => {
      trackMemoryUsage();
      trackRenderPerformance();
    }, 5000);

    return () => clearInterval(interval);
  }, [enabled, measureWebVitals, trackMemoryUsage, trackRenderPerformance, originalFetch]);

  useEffect(() => {
    if (onMetricsUpdate) {
      onMetricsUpdate(metrics);
    }

    if (trackingId) {
      sendMetricsToAnalytics(metrics);
    }
  }, [metrics, onMetricsUpdate, sendMetricsToAnalytics, trackingId]);

  // Performance grade calculation
  const getPerformanceGrade = (metrics: PerformanceMetrics): string => {
    let score = 100;

    if (metrics.lcp && metrics.lcp > 2500) score -= 20;
    if (metrics.fid && metrics.fid > 100) score -= 20;
    if (metrics.cls && metrics.cls > 0.1) score -= 20;
    if (metrics.memoryUsage && metrics.memoryUsage > 50) score -= 15;
    if (metrics.renderTime && metrics.renderTime > 16) score -= 15;

    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  };

  if (!enabled || !isVisible) return null;

  const grade = getPerformanceGrade(metrics);
  const gradeColor = {
    'A': '#22c55e',
    'B': '#84cc16',
    'C': '#eab308',
    'D': '#f59e0b',
    'F': '#ef4444'
  }[grade] || '#6b7280';

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      backgroundColor: theme.colors.panelAlt,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: '8px',
      padding: '12px',
      fontSize: '11px',
      fontFamily: 'monospace',
      color: theme.colors.text,
      zIndex: 9999,
      minWidth: '200px',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <span style={{ fontWeight: 'bold' }}>Performance</span>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{
            backgroundColor: gradeColor,
            color: 'white',
            padding: '2px 6px',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}>
            {grade}
          </span>
          <button
            onClick={() => setIsVisible(false)}
            style={{
              background: 'none',
              border: 'none',
              color: theme.colors.textSubtle,
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            ×
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '4px' }}>
        {metrics.lcp && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>LCP:</span>
            <span style={{ color: metrics.lcp > 2500 ? '#ef4444' : '#22c55e' }}>
              {Math.round(metrics.lcp)}ms
            </span>
          </div>
        )}

        {metrics.fid && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>FID:</span>
            <span style={{ color: metrics.fid > 100 ? '#ef4444' : '#22c55e' }}>
              {Math.round(metrics.fid)}ms
            </span>
          </div>
        )}

        {metrics.cls && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>CLS:</span>
            <span style={{ color: metrics.cls > 0.1 ? '#ef4444' : '#22c55e' }}>
              {metrics.cls.toFixed(3)}
            </span>
          </div>
        )}

        {metrics.renderTime && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Render:</span>
            <span style={{ color: metrics.renderTime > 16 ? '#ef4444' : '#22c55e' }}>
              {Math.round(metrics.renderTime)}ms
            </span>
          </div>
        )}

        {metrics.memoryUsage && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Memory:</span>
            <span style={{ color: metrics.memoryUsage > 50 ? '#f59e0b' : '#22c55e' }}>
              {Math.round(metrics.memoryUsage)}MB
            </span>
          </div>
        )}

        {metrics.componentCount && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Components:</span>
            <span>{metrics.componentCount}</span>
          </div>
        )}

        {metrics.errorRate && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Errors:</span>
            <span style={{ color: '#ef4444' }}>{metrics.errorRate}</span>
          </div>
        )}
      </div>

      <button
        onClick={() => {
              // Performance logging removed in production
        }}
        style={{
          marginTop: '8px',
          padding: '4px 8px',
          backgroundColor: theme.colors.accent,
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '10px',
          cursor: 'pointer',
          width: '100%'
        }}
      >
        Log Details
      </button>
    </div>
  );
}

// Hook for accessing performance metrics
export function usePerformanceMetrics() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});

  const updateMetrics = useCallback((newMetrics: PerformanceMetrics) => {
    setMetrics(newMetrics);
  }, []);

  return { metrics, updateMetrics };
}

// HOC for wrapping components with performance tracking
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = React.memo((props: P) => {
    const startTime = React.useRef<number>();

    React.useEffect(() => {
      startTime.current = performance.now();
    }, []);

    React.useLayoutEffect(() => {
      if (startTime.current) {
        const renderTime = performance.now() - startTime.current;
        if (renderTime > 16) { // Slower than 60fps
          // Slow render warning removed in production
        }
      }
    });

    return <Component {...props} />;
  });

  WrappedComponent.displayName = `withPerformanceTracking(${componentName || Component.displayName || Component.name})`;
  return WrappedComponent;
}