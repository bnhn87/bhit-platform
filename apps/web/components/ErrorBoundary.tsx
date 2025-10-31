/**
 * Error Boundary Component - v2025-09-19 Specification Compliance
 * Provides graceful error handling and recovery mechanisms
 */

import React, { Component, ReactNode } from 'react';

import { theme } from '../lib/theme';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  eventId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      eventId: Math.random().toString(36).substring(2, 15)
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to monitoring service
    this.logErrorToService(error, errorInfo);

    // Call optional error callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    if (hasError) {
      // Reset on key changes
      if (resetKeys && prevProps.resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (key, index) => key !== prevProps.resetKeys?.[index]
        );
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }

      // Reset on any prop change
      if (resetOnPropsChange && prevProps !== this.props) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private logErrorToService = (error: Error, errorInfo: React.ErrorInfo) => {
    // In production, this would send to a service like Sentry
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getCurrentUserId(),
      eventId: this.state.eventId
    };

    // Error logging removed in production build

    // Store in localStorage for offline collection
    try {
      const errors = JSON.parse(localStorage.getItem('bhit_error_reports') || '[]');
      errors.push(errorReport);
      localStorage.setItem('bhit_error_reports', JSON.stringify(errors.slice(-10))); // Keep last 10
    } catch (e) {
      console.warn('Failed to store error report locally:', e);
    }
  };

  private getCurrentUserId = (): string | null => {
    try {
      // Try to get user from various sources
      const authUser = localStorage.getItem('supabase.auth.token');
      if (authUser) {
        const parsed = JSON.parse(authUser);
        return parsed?.user?.id || null;
      }
    } catch {
      // Ignore parsing errors
    }
    return null;
  };

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      eventId: null
    });
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReport = () => {
    const { error, errorInfo, eventId } = this.state;
    const reportUrl = `mailto:support@bhit.co.uk?subject=Error Report ${eventId}&body=${encodeURIComponent(
      `Error Report ID: ${eventId}\n\nError: ${error?.message}\n\nStack Trace:\n${error?.stack}\n\nComponent Stack:\n${errorInfo?.componentStack}\n\nURL: ${window.location.href}\n\nTimestamp: ${new Date().toISOString()}`
    )}`;
    window.open(reportUrl);
  };

  render() {
    const { hasError, error, eventId } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '400px',
          padding: '2rem',
          backgroundColor: theme.colors.background,
          color: theme.colors.text,
          textAlign: 'center',
          border: `1px solid ${theme.colors.error}20`,
          borderRadius: '12px',
          margin: '1rem'
        }}>
          {/* Error Icon */}
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: theme.colors.error + '20',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem'
          }}>
            <span style={{ fontSize: '24px', color: theme.colors.error }}>⚠️</span>
          </div>

          {/* Error Message */}
          <h2 style={{
            color: theme.colors.error,
            marginBottom: '0.5rem',
            fontSize: '1.5rem',
            fontWeight: 600
          }}>
            Something went wrong
          </h2>

          <p style={{
            color: theme.colors.textSubtle,
            marginBottom: '1rem',
            maxWidth: '500px',
            lineHeight: '1.5'
          }}>
            We encountered an unexpected error. This has been logged automatically.
          </p>

          {/* Error Details (Development) */}
          {process.env.NODE_ENV === 'development' && error && (
            <details style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: theme.colors.panelAlt,
              borderRadius: '8px',
              maxWidth: '600px',
              width: '100%',
              textAlign: 'left'
            }}>
              <summary style={{
                cursor: 'pointer',
                fontWeight: 500,
                marginBottom: '0.5rem',
                color: theme.colors.text
              }}>
                Error Details (Development Mode)
              </summary>
              <pre style={{
                fontSize: '0.75rem',
                color: theme.colors.textSubtle,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {error.message}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          )}

          {/* Event ID */}
          <div style={{
            fontSize: '0.875rem',
            color: theme.colors.textSubtle,
            marginBottom: '1.5rem',
            fontFamily: 'monospace'
          }}>
            Error ID: {eventId}
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            <button
              onClick={this.handleRetry}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: theme.colors.accent,
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.accentAlt;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.accent;
              }}
            >
              Try Again
            </button>

            <button
              onClick={this.handleReload}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                color: theme.colors.text,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = theme.colors.panelAlt;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Reload Page
            </button>

            <button
              onClick={this.handleReport}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'transparent',
                color: theme.colors.textSubtle,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'color 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = theme.colors.text;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = theme.colors.textSubtle;
              }}
            >
              Report Issue
            </button>
          </div>

          {/* Recovery Tip */}
          <p style={{
            marginTop: '2rem',
            fontSize: '0.875rem',
            color: theme.colors.textSubtle,
            fontStyle: 'italic'
          }}>
            If this problem persists, try clearing your browser cache or refreshing the page.
          </p>
        </div>
      );
    }

    return children;
  }
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for programmatic error reporting
export function useErrorHandler() {
  return React.useCallback((error: Error, context?: string) => {
    // Manual error logging without ErrorBoundary instance
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: context || 'Manual error report',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      eventId: Math.random().toString(36).substring(2, 15)
    };

    // Error logging removed in production build

    // Store in localStorage for offline collection
    try {
      const errors = JSON.parse(localStorage.getItem('bhit_error_reports') || '[]');
      errors.push(errorReport);
      localStorage.setItem('bhit_error_reports', JSON.stringify(errors.slice(-10))); // Keep last 10
    } catch (e) {
      console.warn('Failed to store error report locally:', e);
    }
  }, []);
}