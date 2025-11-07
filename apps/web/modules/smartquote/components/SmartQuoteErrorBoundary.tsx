import React, { Component, ErrorInfo, ReactNode } from 'react';

import { theme } from '../../../lib/theme';

interface Props {
    children: ReactNode;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class SmartQuoteErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        // Always log errors in ErrorBoundary - these are critical
        console.error('[SmartQuote] Critical Error:', error, errorInfo);

        this.setState({
            error,
            errorInfo
        });

        // Log to external service if configured
        if (process.env.NODE_ENV === 'production') {
            // Example: logErrorToService(error, errorInfo);
        }
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null
        });

        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    background: theme.colors.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 20
                }}>
                    <div style={{
                        background: theme.colors.panel,
                        borderRadius: theme.radii.xl,
                        padding: 40,
                        maxWidth: 600,
                        width: '100%',
                        border: `1px solid ${theme.colors.border}`,
                        boxShadow: theme.shadow
                    }}>
                        <div style={{
                            fontSize: 48,
                            textAlign: 'center',
                            marginBottom: 16
                        }}>
                            ⚠️
                        </div>

                        <h1 style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: theme.colors.text,
                            textAlign: 'center',
                            margin: 0,
                            marginBottom: 8
                        }}>
                            Something went wrong
                        </h1>

                        <p style={{
                            fontSize: 14,
                            color: theme.colors.textSubtle,
                            textAlign: 'center',
                            margin: 0,
                            marginBottom: 24
                        }}>
                            The SmartQuote tool encountered an unexpected error. Don&apos;t worry, your data should be safe.
                        </p>

                        {this.state.error && (
                            <details style={{
                                marginBottom: 24,
                                padding: 16,
                                background: theme.colors.muted,
                                borderRadius: theme.radii.md,
                                border: `1px solid ${theme.colors.border}`
                            }}>
                                <summary style={{
                                    cursor: 'pointer',
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: theme.colors.text,
                                    marginBottom: 8
                                }}>
                                    Error Details (click to expand)
                                </summary>
                                <div style={{
                                    fontSize: 12,
                                    fontFamily: 'monospace',
                                    color: theme.colors.danger,
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                    marginTop: 8
                                }}>
                                    <strong>Error:</strong> {this.state.error.message}
                                    {this.state.error.stack && (
                                        <>
                                            <br /><br />
                                            <strong>Stack Trace:</strong><br />
                                            {this.state.error.stack}
                                        </>
                                    )}
                                </div>
                            </details>
                        )}

                        <div style={{
                            display: 'flex',
                            gap: 12,
                            justifyContent: 'center'
                        }}>
                            <button
                                onClick={this.handleReset}
                                style={{
                                    padding: '12px 24px',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    color: 'white',
                                    background: theme.colors.accent,
                                    border: 'none',
                                    borderRadius: theme.radii.md,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = theme.colors.accentAlt}
                                onMouseOut={(e) => e.currentTarget.style.background = theme.colors.accent}
                            >
                                Try Again
                            </button>

                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    padding: '12px 24px',
                                    fontSize: 14,
                                    fontWeight: 500,
                                    color: theme.colors.text,
                                    background: theme.colors.panelAlt,
                                    border: `1px solid ${theme.colors.border}`,
                                    borderRadius: theme.radii.md,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => e.currentTarget.style.background = theme.colors.muted}
                                onMouseOut={(e) => e.currentTarget.style.background = theme.colors.panelAlt}
                            >
                                Reload Page
                            </button>
                        </div>

                        <div style={{
                            marginTop: 24,
                            padding: 12,
                            background: `${theme.colors.accent}15`,
                            border: `1px solid ${theme.colors.accent}30`,
                            borderRadius: theme.radii.md,
                            fontSize: 12,
                            color: theme.colors.textSubtle,
                            textAlign: 'center'
                        }}>
                            💡 <strong>Tip:</strong> Check your browser console (F12) for more detailed error information, or contact support if the problem persists.
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
