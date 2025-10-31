import React, { useState } from 'react';

import { theme } from '../../../lib/theme';
import { QuoteDetails, ParsedProduct, AppConfig } from '../types';

type WizardStep = 'upload' | 'review' | 'details' | 'calculate' | 'export';

interface QuoteWizardProps {
    config: AppConfig;
    onComplete: () => void;
    currentStep?: WizardStep;
    hasProducts?: boolean;
    hasDetails?: boolean;
    hasResults?: boolean;
}

interface StepConfig {
    id: WizardStep;
    label: string;
    description: string;
    icon: string;
}

export const QuoteWizard: React.FC<QuoteWizardProps> = ({
    currentStep = 'upload',
    hasProducts = false,
    hasDetails = false,
    hasResults = false
}) => {
    const steps: StepConfig[] = [
        {
            id: 'upload',
            label: 'Upload',
            description: 'Upload quote documents',
            icon: '📄'
        },
        {
            id: 'review',
            label: 'Review',
            description: 'Review parsed products',
            icon: '✓'
        },
        {
            id: 'details',
            label: 'Details',
            description: 'Enter quote details',
            icon: '📋'
        },
        {
            id: 'calculate',
            label: 'Calculate',
            description: 'Generate quote',
            icon: '🧮'
        },
        {
            id: 'export',
            label: 'Export',
            description: 'Save and export',
            icon: '💾'
        }
    ];

    const getCurrentStepIndex = () => {
        return steps.findIndex(s => s.id === currentStep);
    };

    const getStepStatus = (stepId: WizardStep): 'completed' | 'current' | 'upcoming' => {
        const currentIndex = getCurrentStepIndex();
        const stepIndex = steps.findIndex(s => s.id === stepId);

        if (stepIndex < currentIndex) return 'completed';
        if (stepIndex === currentIndex) return 'current';
        return 'upcoming';
    };

    const getProgressPercentage = (): number => {
        return ((getCurrentStepIndex() + 1) / steps.length) * 100;
    };

    return (
        <div style={{
            background: theme.colors.panel,
            borderRadius: theme.radii.xl,
            boxShadow: theme.shadow,
            padding: 24,
            border: `1px solid ${theme.colors.border}`,
            marginBottom: 24
        }}>
            {/* Progress Bar */}
            <div style={{ marginBottom: 24 }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8
                }}>
                    <h3 style={{
                        fontSize: 18,
                        fontWeight: 600,
                        color: theme.colors.text,
                        margin: 0
                    }}>
                        Quote Progress
                    </h3>
                    <span style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: theme.colors.accent
                    }}>
                        {Math.round(getProgressPercentage())}% Complete
                    </span>
                </div>

                {/* Progress bar track */}
                <div style={{
                    width: '100%',
                    height: 8,
                    background: theme.colors.muted,
                    borderRadius: theme.radii.md,
                    overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${getProgressPercentage()}%`,
                        height: '100%',
                        background: `linear-gradient(90deg, ${theme.colors.accent}, ${theme.colors.accentAlt})`,
                        transition: 'width 0.3s ease',
                        borderRadius: theme.radii.md
                    }} />
                </div>
            </div>

            {/* Steps */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${steps.length}, 1fr)`,
                gap: 12
            }}>
                {steps.map((step) => {
                    const status = getStepStatus(step.id);

                    const getStatusColor = () => {
                        switch (status) {
                            case 'completed':
                                return theme.colors.accentAlt;
                            case 'current':
                                return theme.colors.accent;
                            default:
                                return theme.colors.textSubtle;
                        }
                    };

                    const getBackgroundColor = () => {
                        switch (status) {
                            case 'completed':
                                return `${theme.colors.accentAlt}15`;
                            case 'current':
                                return `${theme.colors.accent}15`;
                            default:
                                return theme.colors.panelAlt;
                        }
                    };

                    return (
                        <div
                            key={step.id}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                padding: 12,
                                borderRadius: theme.radii.lg,
                                background: getBackgroundColor(),
                                border: `2px solid ${status === 'current' ? getStatusColor() : 'transparent'}`,
                                transition: 'all 0.2s ease',
                                position: 'relative'
                            }}
                        >
                            {/* Icon */}
                            <div style={{
                                fontSize: 24,
                                marginBottom: 8,
                                opacity: status === 'upcoming' ? 0.4 : 1
                            }}>
                                {status === 'completed' ? '✓' : step.icon}
                            </div>

                            {/* Label */}
                            <div style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: getStatusColor(),
                                textAlign: 'center',
                                marginBottom: 4
                            }}>
                                {step.label}
                            </div>

                            {/* Description */}
                            <div style={{
                                fontSize: 11,
                                color: theme.colors.textSubtle,
                                textAlign: 'center',
                                opacity: status === 'upcoming' ? 0.6 : 1
                            }}>
                                {step.description}
                            </div>

                            {/* Current indicator */}
                            {status === 'current' && (
                                <div style={{
                                    position: 'absolute',
                                    top: -6,
                                    right: -6,
                                    width: 12,
                                    height: 12,
                                    borderRadius: '50%',
                                    background: theme.colors.accent,
                                    animation: 'pulse 2s infinite'
                                }} />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Status badges */}
            <div style={{
                display: 'flex',
                gap: 8,
                marginTop: 16,
                flexWrap: 'wrap'
            }}>
                {hasProducts && (
                    <StatusBadge icon="📦" label="Products Added" color={theme.colors.accentAlt} />
                )}
                {hasDetails && (
                    <StatusBadge icon="📝" label="Details Complete" color={theme.colors.accent} />
                )}
                {hasResults && (
                    <StatusBadge icon="✅" label="Quote Calculated" color={theme.colors.accentAlt} />
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
};

const StatusBadge: React.FC<{ icon: string; label: string; color: string }> = ({ icon, label, color }) => {
    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: theme.radii.md,
            background: `${color}15`,
            border: `1px solid ${color}30`,
            fontSize: 12,
            fontWeight: 500,
            color
        }}>
            <span>{icon}</span>
            <span>{label}</span>
        </div>
    );
};
