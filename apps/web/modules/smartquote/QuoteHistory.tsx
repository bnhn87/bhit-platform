import React, { useState, useEffect } from 'react';

import { theme } from '../../lib/theme';


import { ClockIcon, TrashIcon } from './components/icons';
import { hybridStorageService } from './services/databaseStorageService';
import { SavedQuote } from './types';
import { getIconProps } from './utils/iconSizing';


interface QuoteHistoryProps {
    onViewQuote: (quote: SavedQuote) => void;
    onCompare?: () => void;
}

export const QuoteHistory: React.FC<QuoteHistoryProps> = ({ onViewQuote, onCompare }) => {
    const [quotes, setQuotes] = useState<SavedQuote[]>([]);
    
    useEffect(() => {
        const loadQuotesAsync = async () => {
            const loadedQuotes = await hybridStorageService.loadQuotes();
            setQuotes(loadedQuotes);
        };
        loadQuotesAsync();
    }, []);

    const handleDelete = async (quoteId: string) => {
        if(window.confirm("Are you sure you want to delete this quote? This action cannot be undone.")) {
            await hybridStorageService.deleteQuote(quoteId);
            const loadedQuotes = await hybridStorageService.loadQuotes();
            setQuotes(loadedQuotes); // Refresh the list
        }
    }

    return (
        <div style={{
            background: theme.colors.panel,
            borderRadius: theme.radii.lg,
            boxShadow: theme.shadow,
            padding: 24,
            border: `1px solid ${theme.colors.border}`
        }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: `1px solid ${theme.colors.border}`,
                paddingBottom: 16,
                marginBottom: 16,
                flexWrap: 'wrap',
                gap: 16
            }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <ClockIcon {...getIconProps('feature', { color: theme.colors.accent, marginRight: 16 })} />
                    <div>
                        <h2 style={{ fontSize: 24, fontWeight: 600, color: theme.colors.text, margin: 0 }}>Quote History</h2>
                        <p style={{ color: theme.colors.textSubtle, margin: 0 }}>View or manage your previously saved quotes.</p>
                    </div>
                </div>
                {onCompare && quotes.length >= 2 && (
                    <button
                        onClick={onCompare}
                        style={{
                            padding: '10px 16px',
                            background: theme.colors.accent,
                            color: 'white',
                            border: 'none',
                            borderRadius: theme.radii.md,
                            fontSize: 14,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = theme.colors.accentAlt;
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = theme.colors.accent;
                        }}
                    >
                        Compare Quotes
                    </button>
                )}
            </div>

            {quotes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0" }}>
                    <h3 style={{ fontSize: 20, fontWeight: 500, color: theme.colors.text, margin: 0 }}>No Saved Quotes</h3>
                    <p style={{ color: theme.colors.textSubtle, margin: 0, marginTop: 8 }}>You haven&apos;t saved any quotes yet. Once you save a quote, it will appear here.</p>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {quotes.map(quote => (
                        <div key={quote.id} style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto auto",
                            gap: 16,
                            alignItems: "center",
                            background: theme.colors.panelAlt,
                            padding: 16,
                            borderRadius: theme.radii.md,
                            border: `1px solid ${theme.colors.border}`,
                            transition: "background 0.2s ease"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = theme.colors.muted}
                        onMouseOut={(e) => e.currentTarget.style.background = theme.colors.panelAlt}>
                            <div style={{ overflow: "hidden" }}>
                                <p style={{
                                    fontWeight: 700,
                                    fontSize: 18,
                                    color: theme.colors.accent,
                                    margin: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                }} title={quote.details.quoteRef || quote.id}>
                                    Ref: {quote.details.quoteRef || quote.id}
                                </p>
                                <p style={{
                                    fontSize: 14,
                                    color: theme.colors.textSubtle,
                                    margin: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                }}>
                                    Client: <span style={{ fontWeight: 500 }}>{quote.details.client || 'N/A'}</span>
                                    <span style={{ margin: "0 8px", color: theme.colors.border }}>|</span>
                                    Saved: <span style={{ fontWeight: 500 }}>{new Date(quote.savedAt).toLocaleString()}</span>
                                </p>
                            </div>
                            <p style={{
                                textAlign: "right",
                                fontWeight: 700,
                                fontSize: 20,
                                color: theme.colors.text,
                                margin: 0
                            }}>
                                £{quote.results.pricing.totalCost.toFixed(2)}
                            </p>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
                                <button
                                    onClick={() => onViewQuote(quote)}
                                    style={{
                                        padding: "8px 16px",
                                        fontSize: 14,
                                        fontWeight: 500,
                                        color: "white",
                                        background: theme.colors.accent,
                                        borderRadius: theme.radii.md,
                                        border: "none",
                                        cursor: "pointer"
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = "#2563eb"}
                                    onMouseOut={(e) => e.currentTarget.style.background = theme.colors.accent}
                                >
                                    View
                                </button>
                                <button
                                    onClick={() => handleDelete(quote.id)}
                                    style={{
                                        padding: 8,
                                        color: theme.colors.textSubtle,
                                        background: theme.colors.muted,
                                        borderRadius: theme.radii.md,
                                        border: "none",
                                        cursor: "pointer"
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = `${theme.colors.danger}20`;
                                        e.currentTarget.style.color = theme.colors.danger;
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = theme.colors.muted;
                                        e.currentTarget.style.color = theme.colors.textSubtle;
                                    }}
                                >
                                    <TrashIcon style={{ height: 20, width: 20 }}/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
