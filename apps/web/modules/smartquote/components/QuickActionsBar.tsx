import React, { useState } from 'react';

import { theme } from '../../../lib/theme';
import { SaveStatus } from '../services/storageService';
import { SaveStatusIndicator } from './SaveStatusIndicator';

interface QuickActionsBarProps {
    onSave?: () => void;
    onExportPDF?: () => void;
    onExportXLSX?: () => void;
    onCreateJob?: () => void;
    onUndo?: () => void;
    onRedo?: () => void;
    saveStatus?: SaveStatus;
    saveError?: string;
    canUndo?: boolean;
    canRedo?: boolean;
    isDirty?: boolean; // Has unsaved changes
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
    onSave,
    onExportPDF,
    onExportXLSX,
    onCreateJob,
    onUndo,
    onRedo,
    saveStatus = 'idle',
    saveError,
    canUndo = false,
    canRedo = false,
    isDirty = false
}) => {
    const [showTooltip, setShowTooltip] = useState<string | null>(null);

    return (
        <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: theme.colors.panel,
            borderBottom: `1px solid ${theme.colors.border}`,
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
            {/* Left Section - Primary Actions */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {/* Save Button */}
                {onSave && (
                    <ActionButton
                        icon="💾"
                        label="Save"
                        onClick={onSave}
                        variant="primary"
                        disabled={!isDirty || saveStatus === 'saving'}
                        isLoading={saveStatus === 'saving'}
                        tooltip={isDirty ? 'Save changes' : 'No changes to save'}
                        showTooltip={showTooltip === 'save'}
                        onShowTooltip={() => setShowTooltip('save')}
                        onHideTooltip={() => setShowTooltip(null)}
                    />
                )}

                {/* Undo/Redo */}
                {(onUndo || onRedo) && (
                    <div style={{ display: 'flex', gap: 4 }}>
                        {onUndo && (
                            <ActionButton
                                icon="↶"
                                onClick={onUndo}
                                variant="secondary"
                                disabled={!canUndo}
                                tooltip="Undo (Ctrl+Z)"
                                showTooltip={showTooltip === 'undo'}
                                onShowTooltip={() => setShowTooltip('undo')}
                                onHideTooltip={() => setShowTooltip(null)}
                            />
                        )}
                        {onRedo && (
                            <ActionButton
                                icon="↷"
                                onClick={onRedo}
                                variant="secondary"
                                disabled={!canRedo}
                                tooltip="Redo (Ctrl+Y)"
                                showTooltip={showTooltip === 'redo'}
                                onShowTooltip={() => setShowTooltip('redo')}
                                onHideTooltip={() => setShowTooltip(null)}
                            />
                        )}
                    </div>
                )}

                {/* Divider */}
                {(onExportPDF || onExportXLSX || onCreateJob) && (
                    <div style={{
                        width: 1,
                        height: 24,
                        background: theme.colors.border,
                        margin: '0 8px'
                    }} />
                )}

                {/* Export Actions */}
                {onExportPDF && (
                    <ActionButton
                        icon="📄"
                        label="PDF"
                        onClick={onExportPDF}
                        variant="secondary"
                        tooltip="Export Client PDF"
                        showTooltip={showTooltip === 'pdf'}
                        onShowTooltip={() => setShowTooltip('pdf')}
                        onHideTooltip={() => setShowTooltip(null)}
                    />
                )}

                {onExportXLSX && (
                    <ActionButton
                        icon="📊"
                        label="Excel"
                        onClick={onExportXLSX}
                        variant="secondary"
                        tooltip="Export Internal Excel"
                        showTooltip={showTooltip === 'xlsx'}
                        onShowTooltip={() => setShowTooltip('xlsx')}
                        onHideTooltip={() => setShowTooltip(null)}
                    />
                )}

                {onCreateJob && (
                    <ActionButton
                        icon="🏗️"
                        label="Create Job"
                        onClick={onCreateJob}
                        variant="accent"
                        tooltip="Create job from this quote"
                        showTooltip={showTooltip === 'job'}
                        onShowTooltip={() => setShowTooltip('job')}
                        onHideTooltip={() => setShowTooltip(null)}
                    />
                )}
            </div>

            {/* Right Section - Status Indicators */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {/* Unsaved Changes Indicator */}
                {isDirty && saveStatus !== 'saving' && (
                    <div style={{
                        fontSize: 12,
                        color: theme.colors.textSubtle,
                        fontStyle: 'italic'
                    }}>
                        Unsaved changes
                    </div>
                )}

                {/* Save Status */}
                {onSave && (
                    <SaveStatusIndicator
                        status={saveStatus}
                        error={saveError}
                    />
                )}
            </div>
        </div>
    );
};

interface ActionButtonProps {
    icon: string;
    label?: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'accent';
    disabled?: boolean;
    isLoading?: boolean;
    tooltip?: string;
    showTooltip?: boolean;
    onShowTooltip?: () => void;
    onHideTooltip?: () => void;
}

const ActionButton: React.FC<ActionButtonProps> = ({
    icon,
    label,
    onClick,
    variant = 'secondary',
    disabled = false,
    isLoading = false,
    tooltip,
    showTooltip = false,
    onShowTooltip,
    onHideTooltip
}) => {
    const getVariantStyles = () => {
        if (disabled) {
            return {
                background: theme.colors.muted,
                color: theme.colors.textSubtle,
                cursor: 'not-allowed',
                opacity: 0.5
            };
        }

        switch (variant) {
            case 'primary':
                return {
                    background: `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentAlt})`,
                    color: 'white',
                    boxShadow: `0 2px 8px ${theme.colors.accent}30`
                };
            case 'accent':
                return {
                    background: theme.colors.accentAlt,
                    color: 'white',
                    boxShadow: `0 2px 8px ${theme.colors.accentAlt}30`
                };
            case 'secondary':
            default:
                return {
                    background: theme.colors.panelAlt,
                    color: theme.colors.text,
                    border: `1px solid ${theme.colors.border}`
                };
        }
    };

    const styles = getVariantStyles();

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={onClick}
                disabled={disabled || isLoading}
                onMouseEnter={onShowTooltip}
                onMouseLeave={onHideTooltip}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: label ? '8px 16px' : '8px 12px',
                    borderRadius: theme.radii.md,
                    border: 'none',
                    fontSize: 14,
                    fontWeight: 500,
                    cursor: disabled || isLoading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    ...styles
                }}
                onMouseOver={(e) => {
                    if (!disabled && !isLoading) {
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        if (variant === 'secondary') {
                            e.currentTarget.style.background = theme.colors.muted;
                        }
                    }
                }}
                onMouseOut={(e) => {
                    if (!disabled && !isLoading) {
                        e.currentTarget.style.transform = 'translateY(0)';
                        if (variant === 'secondary') {
                            e.currentTarget.style.background = theme.colors.panelAlt;
                        }
                    }
                }}
            >
                <span style={{
                    fontSize: 16,
                    animation: isLoading ? 'spin 1s linear infinite' : 'none'
                }}>
                    {isLoading ? '⏳' : icon}
                </span>
                {label && <span>{label}</span>}
            </button>

            {/* Tooltip */}
            {tooltip && showTooltip && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginTop: 8,
                    padding: '6px 12px',
                    background: 'rgba(0, 0, 0, 0.9)',
                    color: 'white',
                    fontSize: 12,
                    borderRadius: theme.radii.sm,
                    whiteSpace: 'nowrap',
                    zIndex: 1000,
                    pointerEvents: 'none'
                }}>
                    {tooltip}
                    <div style={{
                        position: 'absolute',
                        top: -4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: 0,
                        height: 0,
                        borderLeft: '4px solid transparent',
                        borderRight: '4px solid transparent',
                        borderBottom: '4px solid rgba(0, 0, 0, 0.9)'
                    }} />
                </div>
            )}

            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};
