import React from 'react';

import { theme } from '../../../lib/theme';

const shimmerAnimation = `
@keyframes shimmer {
    0% {
        background-position: -1000px 0;
    }
    100% {
        background-position: 1000px 0;
    }
}
`;

const shimmerStyle: React.CSSProperties = {
    background: `linear-gradient(
        90deg,
        ${theme.colors.muted} 0%,
        ${theme.colors.panelAlt} 50%,
        ${theme.colors.muted} 100%
    )`,
    backgroundSize: '1000px 100%',
    animation: 'shimmer 2s infinite linear'
};

export const SkeletonBox: React.FC<{ width?: string | number; height?: string | number; style?: React.CSSProperties }> = ({
    width = '100%',
    height = 20,
    style = {}
}) => {
    return (
        <>
            <style>{shimmerAnimation}</style>
            <div
                style={{
                    width,
                    height,
                    borderRadius: theme.radii.sm,
                    ...shimmerStyle,
                    ...style
                }}
            />
        </>
    );
};

export const ProductListSkeleton: React.FC = () => {
    return (
        <div style={{
            background: theme.colors.panel,
            borderRadius: theme.radii.xl,
            padding: 24,
            border: `1px solid ${theme.colors.border}`
        }}>
            <SkeletonBox height={24} width={200} style={{ marginBottom: 16 }} />
            <SkeletonBox height={16} width={300} style={{ marginBottom: 24 }} />

            {[1, 2, 3, 4, 5].map(i => (
                <div
                    key={i}
                    style={{
                        display: 'flex',
                        gap: 12,
                        marginBottom: 12,
                        padding: 12,
                        background: theme.colors.panelAlt,
                        borderRadius: theme.radii.md
                    }}
                >
                    <SkeletonBox width={60} height={40} />
                    <div style={{ flex: 1 }}>
                        <SkeletonBox height={16} width="80%" style={{ marginBottom: 8 }} />
                        <SkeletonBox height={14} width="60%" />
                    </div>
                    <SkeletonBox width={80} height={40} />
                </div>
            ))}
        </div>
    );
};

export const QuoteDetailsSkeleton: React.FC = () => {
    return (
        <div style={{
            background: theme.colors.panel,
            borderRadius: theme.radii.xl,
            padding: 24,
            border: `1px solid ${theme.colors.border}`
        }}>
            <SkeletonBox height={24} width={180} style={{ marginBottom: 20 }} />

            {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ marginBottom: 16 }}>
                    <SkeletonBox height={12} width={100} style={{ marginBottom: 6 }} />
                    <SkeletonBox height={40} width="100%" />
                </div>
            ))}

            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                <SkeletonBox height={40} width={120} />
                <SkeletonBox height={40} width={120} />
            </div>
        </div>
    );
};

export const ResultsDisplaySkeleton: React.FC = () => {
    return (
        <div style={{
            background: theme.colors.panel,
            borderRadius: theme.radii.xl,
            padding: 32,
            border: `1px solid ${theme.colors.border}`
        }}>
            <SkeletonBox height={28} width={250} style={{ marginBottom: 24 }} />

            {/* Metric cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 24
            }}>
                {[1, 2, 3, 4].map(i => (
                    <div
                        key={i}
                        style={{
                            padding: 16,
                            background: theme.colors.panelAlt,
                            borderRadius: theme.radii.lg,
                            border: `1px solid ${theme.colors.border}`
                        }}
                    >
                        <SkeletonBox height={14} width={100} style={{ marginBottom: 8 }} />
                        <SkeletonBox height={32} width={120} />
                    </div>
                ))}
            </div>

            {/* Table skeleton */}
            <div style={{
                background: theme.colors.panelAlt,
                borderRadius: theme.radii.md,
                padding: 16
            }}>
                <SkeletonBox height={20} width={200} style={{ marginBottom: 16 }} />
                {[1, 2, 3, 4, 5].map(i => (
                    <div
                        key={i}
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 2fr 1fr 1fr',
                            gap: 12,
                            marginBottom: 12
                        }}
                    >
                        <SkeletonBox height={16} />
                        <SkeletonBox height={16} />
                        <SkeletonBox height={16} />
                        <SkeletonBox height={16} />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const QuoteHistorySkeleton: React.FC = () => {
    return (
        <div>
            <SkeletonBox height={32} width={200} style={{ marginBottom: 24 }} />

            <div style={{ display: 'grid', gap: 16 }}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div
                        key={i}
                        style={{
                            background: theme.colors.panel,
                            borderRadius: theme.radii.lg,
                            padding: 20,
                            border: `1px solid ${theme.colors.border}`
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                            <div style={{ flex: 1 }}>
                                <SkeletonBox height={20} width="60%" style={{ marginBottom: 8 }} />
                                <SkeletonBox height={14} width="40%" />
                            </div>
                            <div>
                                <SkeletonBox width={100} height={32} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <SkeletonBox width={80} height={24} />
                            <SkeletonBox width={80} height={24} />
                            <SkeletonBox width={80} height={24} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const ParsingLoadingState: React.FC<{ message?: string }> = ({ message = 'Analyzing documents...' }) => {
    return (
        <div style={{
            minHeight: 400,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24
        }}>
            <div style={{ position: 'relative', width: 80, height: 80 }}>
                <div style={{
                    width: '100%',
                    height: '100%',
                    border: `4px solid ${theme.colors.muted}`,
                    borderTop: `4px solid ${theme.colors.accent}`,
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                }} />
            </div>

            <div style={{ textAlign: 'center' }}>
                <div style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: theme.colors.text,
                    marginBottom: 8
                }}>
                    {message}
                </div>
                <div style={{
                    fontSize: 14,
                    color: theme.colors.textSubtle
                }}>
                    This may take a few moments...
                </div>
            </div>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
