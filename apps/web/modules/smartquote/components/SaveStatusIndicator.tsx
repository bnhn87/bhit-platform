import React from 'react';

import { theme } from '../../../lib/theme';
import { SaveStatus } from '../services/storageService';

interface SaveStatusIndicatorProps {
    status: SaveStatus;
    error?: string;
    conflictResolved?: boolean;
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({ status, error, conflictResolved }) => {
    const getStatusConfig = () => {
        switch (status) {
            case 'idle':
                return {
                    icon: '⚪',
                    text: 'Not saved',
                    color: theme.colors.textSubtle,
                    background: 'transparent'
                };
            case 'saving':
                return {
                    icon: '🔄',
                    text: 'Saving...',
                    color: theme.colors.accent,
                    background: `${theme.colors.accent}10`
                };
            case 'saved':
                return {
                    icon: '✓',
                    text: conflictResolved ? 'Saved (conflict resolved)' : 'Saved successfully',
                    color: theme.colors.accentAlt,
                    background: `${theme.colors.accentAlt}10`
                };
            case 'error':
                return {
                    icon: '✗',
                    text: error || 'Save failed',
                    color: theme.colors.danger,
                    background: `${theme.colors.danger}10`
                };
        }
    };

    const config = getStatusConfig();

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 12px',
            borderRadius: theme.radii.md,
            background: config.background,
            border: `1px solid ${config.color}30`,
            fontSize: 13,
            fontWeight: 500,
            color: config.color,
            transition: 'all 0.3s ease'
        }}>
            <span style={{
                display: 'inline-block',
                animation: status === 'saving' ? 'spin 1s linear infinite' : 'none'
            }}>
                {config.icon}
            </span>
            <span>{config.text}</span>

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
