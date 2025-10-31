import React, { useState, useMemo } from 'react';

import { theme } from '../../../lib/theme';
import { useBreakpoint, useIsMobile } from '../hooks/useResponsive';
import { SavedQuote } from '../types';
import { getDashboardCardStyle, getDashboardButtonStyle, getDashboardTypographyStyle } from '../utils/dashboardStyles';
import { getResponsiveContainerStyles, responsiveSpacing } from '../utils/responsive';
import { getButtonA11yProps } from '../utils/accessibilityHelpers';
import { CheckCircleIcon, XCircleIcon } from './icons';
import { getIconProps } from '../utils/iconSizing';

interface QuoteComparisonViewProps {
    quotes: SavedQuote[];
    onClose: () => void;
    onLoadQuote?: (quote: SavedQuote) => void;
}

export const QuoteComparisonView: React.FC<QuoteComparisonViewProps> = ({
    quotes,
    onClose,
    onLoadQuote
}) => {
    const breakpoint = useBreakpoint();
    const isMobile = useIsMobile();
    const [selectedQuoteIds, setSelectedQuoteIds] = useState<string[]>([]);

    const sortedQuotes = useMemo(() => {
        return [...quotes].sort((a, b) =>
            new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
        );
    }, [quotes]);

    const selectedQuotes = useMemo(() => {
        return selectedQuoteIds
            .map(id => sortedQuotes.find(q => q.id === id))
            .filter(Boolean) as SavedQuote[];
    }, [selectedQuoteIds, sortedQuotes]);

    const toggleQuoteSelection = (quoteId: string) => {
        setSelectedQuoteIds(prev => {
            if (prev.includes(quoteId)) {
                return prev.filter(id => id !== quoteId);
            }
            // Limit to 3 quotes for comparison
            if (prev.length >= 3) {
                return [...prev.slice(1), quoteId];
            }
            return [...prev, quoteId];
        });
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            minimumFractionDigits: 2
        }).format(value);
    };

    const formatDate = (timestamp: string) => {
        return new Date(timestamp).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    if (sortedQuotes.length === 0) {
        return (
            <div
                style={{
                    ...getDashboardCardStyle('standard'),
                    textAlign: 'center',
                    padding: responsiveSpacing[breakpoint].padding
                }}
            >
                <h2 style={{ ...getDashboardTypographyStyle('sectionHeader'), margin: '0 0 16px 0' }}>
                    No Saved Quotes
                </h2>
                <p style={{ ...getDashboardTypographyStyle('bodyText'), color: theme.colors.textSubtle, marginBottom: 24 }}>
                    Save some quotes to compare them side-by-side.
                </p>
                <button
                    {...getButtonA11yProps({ label: 'Close comparison view' })}
                    onClick={onClose}
                    style={getDashboardButtonStyle('primary')}
                >
                    Close
                </button>
            </div>
        );
    }

    return (
        <div
            role="region"
            aria-label="Quote comparison view"
            style={{
                ...getResponsiveContainerStyles(breakpoint),
                padding: responsiveSpacing[breakpoint].padding
            }}
        >
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 24,
                flexWrap: 'wrap',
                gap: 16
            }}>
                <div>
                    <h1 style={{
                        ...getDashboardTypographyStyle('mainTitle'),
                        margin: 0,
                        fontSize: isMobile ? 24 : 28
                    }}>
                        Compare Quotes
                    </h1>
                    <p style={{
                        ...getDashboardTypographyStyle('bodyText'),
                        color: theme.colors.textSubtle,
                        margin: '4px 0 0 0',
                        fontSize: isMobile ? 13 : 14
                    }}>
                        Select up to 3 quotes to compare side-by-side
                    </p>
                </div>
                <button
                    {...getButtonA11yProps({ label: 'Close comparison view' })}
                    onClick={onClose}
                    style={{
                        ...getDashboardButtonStyle('secondary'),
                        fontSize: isMobile ? 16 : 14
                    }}
                >
                    Close
                </button>
            </div>

            {/* Quote Selection */}
            {selectedQuotes.length < 2 && (
                <div
                    style={{
                        ...getDashboardCardStyle('standard'),
                        marginBottom: 24,
                        padding: responsiveSpacing[breakpoint].padding
                    }}
                >
                    <h2 style={{
                        ...getDashboardTypographyStyle('sectionHeader'),
                        margin: '0 0 16px 0',
                        fontSize: isMobile ? 18 : 20
                    }}>
                        Select Quotes to Compare
                    </h2>
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: 12
                    }}>
                        {sortedQuotes.slice(0, 6).map(quote => {
                            const isSelected = selectedQuoteIds.includes(quote.id);
                            return (
                                <button
                                    key={quote.id}
                                    {...getButtonA11yProps({
                                        label: `${isSelected ? 'Deselect' : 'Select'} quote ${quote.details.quoteRef || 'Untitled'}`,
                                        pressed: isSelected
                                    })}
                                    onClick={() => toggleQuoteSelection(quote.id)}
                                    style={{
                                        padding: 16,
                                        border: `2px solid ${isSelected ? theme.colors.accent : theme.colors.border}`,
                                        borderRadius: theme.radii.md,
                                        background: isSelected ? `${theme.colors.accent}15` : 'transparent',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                        <div style={{
                                            ...getDashboardTypographyStyle('cardTitle'),
                                            color: theme.colors.text,
                                            fontSize: isMobile ? 14 : 16
                                        }}>
                                            {quote.details.quoteRef || 'Untitled Quote'}
                                        </div>
                                        {isSelected && (
                                            <CheckCircleIcon {...getIconProps('status', { color: theme.colors.accent })} />
                                        )}
                                    </div>
                                    <div style={{
                                        ...getDashboardTypographyStyle('bodyText'),
                                        color: theme.colors.textSubtle,
                                        fontSize: isMobile ? 12 : 13
                                    }}>
                                        {quote.details.client || 'No client'}
                                    </div>
                                    <div style={{
                                        ...getDashboardTypographyStyle('bodyText'),
                                        color: theme.colors.textSubtle,
                                        fontSize: isMobile ? 11 : 12,
                                        marginTop: 4
                                    }}>
                                        {formatDate(quote.savedAt)} • {quote.products.length} products
                                    </div>
                                    <div style={{
                                        ...getDashboardTypographyStyle('cardTitle'),
                                        color: theme.colors.accent,
                                        fontSize: isMobile ? 14 : 16,
                                        marginTop: 8
                                    }}>
                                        {formatCurrency(quote.results.pricing.totalCost)}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Comparison Table */}
            {selectedQuotes.length >= 2 && (
                <div
                    role="table"
                    aria-label="Quote comparison table"
                    style={{
                        ...getDashboardCardStyle('standard'),
                        padding: 0,
                        overflow: 'auto'
                    }}
                >
                    {isMobile ? (
                        // Mobile: Stacked cards
                        <div style={{ padding: responsiveSpacing[breakpoint].padding }}>
                            {selectedQuotes.map((quote, idx) => (
                                <div
                                    key={quote.id}
                                    style={{
                                        marginBottom: 24,
                                        paddingBottom: 24,
                                        borderBottom: idx < selectedQuotes.length - 1 ? `1px solid ${theme.colors.border}` : 'none'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                        <h3 style={{
                                            ...getDashboardTypographyStyle('sectionHeader'),
                                            margin: 0,
                                            fontSize: 18
                                        }}>
                                            {quote.details.quoteRef || 'Untitled Quote'}
                                        </h3>
                                        <button
                                            {...getButtonA11yProps({ label: `Remove ${quote.details.quoteRef} from comparison` })}
                                            onClick={() => toggleQuoteSelection(quote.id)}
                                            style={{
                                                padding: 8,
                                                border: `1px solid ${theme.colors.border}`,
                                                borderRadius: theme.radii.sm,
                                                background: 'transparent',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <XCircleIcon {...getIconProps('status', { color: theme.colors.textSubtle })} />
                                        </button>
                                    </div>

                                    <ComparisonRow label="Client" value={quote.details.client || 'N/A'} isMobile={isMobile} />
                                    <ComparisonRow label="Project" value={quote.details.project} isMobile={isMobile} />
                                    <ComparisonRow label="Date" value={formatDate(quote.savedAt)} isMobile={isMobile} />
                                    <ComparisonRow label="Products" value={`${quote.products.length} items`} isMobile={isMobile} />
                                    <ComparisonRow label="Fitter Cost" value={formatCurrency(quote.results.pricing.fitterCost)} isMobile={isMobile} />
                                    <ComparisonRow label="Supervisor Cost" value={formatCurrency(quote.results.pricing.supervisorCost)} isMobile={isMobile} />
                                    <ComparisonRow
                                        label="Grand Total"
                                        value={formatCurrency(quote.results.pricing.totalCost)}
                                        isMobile={isMobile}
                                        highlight
                                    />

                                    {onLoadQuote && (
                                        <button
                                            {...getButtonA11yProps({ label: `Load ${quote.details.quoteRef} quote` })}
                                            onClick={() => onLoadQuote(quote)}
                                            style={{
                                                ...getDashboardButtonStyle('primary'),
                                                width: '100%',
                                                marginTop: 16,
                                                fontSize: 16
                                            }}
                                        >
                                            Load This Quote
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Desktop: Table layout
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: `2px solid ${theme.colors.border}` }}>
                                    <th style={{
                                        ...getDashboardTypographyStyle('cardTitle'),
                                        textAlign: 'left',
                                        padding: 16,
                                        width: '200px',
                                        position: 'sticky',
                                        left: 0,
                                        background: theme.colors.panel,
                                        zIndex: 1
                                    }}>
                                        Comparison
                                    </th>
                                    {selectedQuotes.map(quote => (
                                        <th key={quote.id} style={{
                                            ...getDashboardTypographyStyle('cardTitle'),
                                            textAlign: 'left',
                                            padding: 16,
                                            minWidth: '200px'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <span>{quote.details.quoteRef || 'Untitled'}</span>
                                                <button
                                                    {...getButtonA11yProps({ label: `Remove ${quote.details.quoteRef} from comparison` })}
                                                    onClick={() => toggleQuoteSelection(quote.id)}
                                                    style={{
                                                        padding: 6,
                                                        border: `1px solid ${theme.colors.border}`,
                                                        borderRadius: theme.radii.sm,
                                                        background: 'transparent',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <XCircleIcon {...getIconProps('status', { color: theme.colors.textSubtle })} />
                                                </button>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <ComparisonTableRow label="Client" values={selectedQuotes.map(q => q.details.client || 'N/A')} />
                                <ComparisonTableRow label="Project" values={selectedQuotes.map(q => q.details.project)} />
                                <ComparisonTableRow label="Date" values={selectedQuotes.map(q => formatDate(q.savedAt))} />
                                <ComparisonTableRow label="Products" values={selectedQuotes.map(q => `${q.products.length} items`)} />
                                <ComparisonTableRow label="Fitter Cost" values={selectedQuotes.map(q => formatCurrency(q.results.pricing.fitterCost))} />
                                <ComparisonTableRow label="Supervisor Cost" values={selectedQuotes.map(q => formatCurrency(q.results.pricing.supervisorCost))} />
                                <ComparisonTableRow
                                    label="Grand Total"
                                    values={selectedQuotes.map(q => formatCurrency(q.results.pricing.totalCost))}
                                    highlight
                                />
                                {onLoadQuote && (
                                    <tr>
                                        <td style={{ padding: 16, position: 'sticky', left: 0, background: theme.colors.panel }}></td>
                                        {selectedQuotes.map(quote => (
                                            <td key={quote.id} style={{ padding: 16 }}>
                                                <button
                                                    {...getButtonA11yProps({ label: `Load ${quote.details.quoteRef} quote` })}
                                                    onClick={() => onLoadQuote(quote)}
                                                    style={{
                                                        ...getDashboardButtonStyle('primary'),
                                                        width: '100%'
                                                    }}
                                                >
                                                    Load Quote
                                                </button>
                                            </td>
                                        ))}
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
};

// Helper component for mobile comparison rows
const ComparisonRow: React.FC<{ label: string; value: string; isMobile: boolean; highlight?: boolean }> = ({
    label,
    value,
    isMobile,
    highlight
}) => (
    <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: `1px solid ${theme.colors.border}`
    }}>
        <span style={{
            ...getDashboardTypographyStyle('bodyText'),
            color: theme.colors.textSubtle,
            fontSize: 13
        }}>
            {label}
        </span>
        <span style={{
            ...getDashboardTypographyStyle(highlight ? 'cardTitle' : 'bodyText'),
            color: highlight ? theme.colors.accent : theme.colors.text,
            fontSize: highlight ? 16 : 14,
            fontWeight: highlight ? 600 : 400
        }}>
            {value}
        </span>
    </div>
);

// Helper component for desktop table rows
const ComparisonTableRow: React.FC<{ label: string; values: string[]; highlight?: boolean }> = ({
    label,
    values,
    highlight
}) => (
    <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
        <td style={{
            ...getDashboardTypographyStyle('bodyText'),
            color: theme.colors.textSubtle,
            padding: 16,
            position: 'sticky',
            left: 0,
            background: theme.colors.panel,
            fontWeight: 500
        }}>
            {label}
        </td>
        {values.map((value, idx) => (
            <td key={idx} style={{
                ...getDashboardTypographyStyle(highlight ? 'cardTitle' : 'bodyText'),
                color: highlight ? theme.colors.accent : theme.colors.text,
                padding: 16,
                fontWeight: highlight ? 600 : 400
            }}>
                {value}
            </td>
        ))}
    </tr>
);
