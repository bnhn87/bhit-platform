import React from 'react';
import { theme } from '../../../lib/theme';
import { getDashboardCardStyle, getDashboardTypographyStyle } from '../utils/dashboardStyles';
import { CalculationResults, QuoteDetails } from '../types';
import {
    CurrencyPoundIcon,
    ClockIcon,
    UsersIcon,
    TruckIcon,
    CalendarIcon,
    BuildingIcon,
    CheckCircleIcon
} from './icons';

interface QuoteSummaryCardProps {
    results: CalculationResults;
    details: QuoteDetails;
}

export const QuoteSummaryCard: React.FC<QuoteSummaryCardProps> = ({ results, details }) => {
    const { labour, crew, pricing, waste } = results;

    const summaryItems = [
        {
            icon: CurrencyPoundIcon,
            label: 'Total Quote Value',
            value: `£${pricing.totalCost.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            color: theme.colors.success,
            primary: true
        },
        {
            icon: CalendarIcon,
            label: 'Project Duration',
            value: `${crew.totalProjectDays.toFixed(1)} days`,
            sublabel: `${labour.bufferedHours.toFixed(2)} total hours`
        },
        {
            icon: UsersIcon,
            label: 'Installation Team',
            value: `${crew.crewSize} person${crew.crewSize > 1 ? 's' : ''}`,
            sublabel: crew.vanType === 'twoMan' ? 'Two-man van' : 'One-man van'
        },
        {
            icon: ClockIcon,
            label: 'Labour Hours',
            value: `${labour.totalHours.toFixed(2)}h`,
            sublabel: `+${labour.durationBufferPercentage}% buffer`
        },
        {
            icon: TruckIcon,
            label: 'Waste Removal',
            value: waste.loadsRequired > 0 ? `${waste.loadsRequired.toFixed(1)} loads` : 'Minimal',
            sublabel: `${waste.totalVolumeM3.toFixed(2)}m³ total`
        }
    ];

    const costBreakdown = [
        { label: 'Labour', value: pricing.labourCost, percentage: (pricing.labourCost / pricing.totalCost) * 100 },
        { label: 'Waste', value: pricing.wasteCost, percentage: (pricing.wasteCost / pricing.totalCost) * 100 },
        { label: 'Parking', value: pricing.parkingCost, percentage: (pricing.parkingCost / pricing.totalCost) * 100 },
        { label: 'Rework', value: pricing.specialistReworkingCost || 0, percentage: ((pricing.specialistReworkingCost || 0) / pricing.totalCost) * 100 }
    ].filter(item => item.value > 0);

    return (
        <div style={{
            ...getDashboardCardStyle('standard'),
            padding: 0,
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${theme.colors.panel}, ${theme.colors.panelAlt})`
        }}>
            {/* Header */}
            <div style={{
                padding: '24px',
                borderBottom: `1px solid ${theme.colors.border}`,
                background: theme.colors.bg
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h2 style={{
                            ...getDashboardTypographyStyle('sectionHeader'),
                            margin: 0,
                            color: theme.colors.text,
                            fontSize: '24px'
                        }}>Quote Summary</h2>
                        <p style={{
                            ...getDashboardTypographyStyle('bodyText'),
                            margin: '8px 0 0 0',
                            color: theme.colors.textSubtle
                        }}>
                            {details.client} • {details.project}
                        </p>
                        <p style={{
                            ...getDashboardTypographyStyle('smallText'),
                            margin: '4px 0 0 0',
                            color: theme.colors.textSubtle
                        }}>
                            Quote Ref: {details.quoteRef || 'Draft'}
                        </p>
                    </div>
                    <div style={{
                        padding: '8px 16px',
                        background: theme.colors.success,
                        borderRadius: theme.radii.full,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <CheckCircleIcon style={{ width: 16, height: 16, color: 'white' }} />
                        <span style={{
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600
                        }}>Ready</span>
                    </div>
                </div>
            </div>

            {/* Main Metrics Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1px',
                background: theme.colors.border,
                borderBottom: `1px solid ${theme.colors.border}`
            }}>
                {summaryItems.map((item, index) => (
                    <div
                        key={index}
                        style={{
                            padding: '20px',
                            background: item.primary
                                ? `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentAlt})`
                                : theme.colors.panel,
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {item.primary && (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                right: 0,
                                width: '100px',
                                height: '100px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '50%',
                                transform: 'translate(30px, -30px)'
                            }} />
                        )}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '12px'
                        }}>
                            <item.icon style={{
                                width: 20,
                                height: 20,
                                color: item.primary ? 'white' : item.color || theme.colors.textSubtle
                            }} />
                            <span style={{
                                ...getDashboardTypographyStyle('labelText'),
                                color: item.primary ? 'rgba(255, 255, 255, 0.9)' : theme.colors.textSubtle,
                                fontSize: '13px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {item.label}
                            </span>
                        </div>
                        <div style={{
                            fontSize: item.primary ? '28px' : '24px',
                            fontWeight: 700,
                            color: item.primary ? 'white' : theme.colors.text,
                            marginBottom: item.sublabel ? '4px' : 0
                        }}>
                            {item.value}
                        </div>
                        {item.sublabel && (
                            <div style={{
                                fontSize: '13px',
                                color: item.primary ? 'rgba(255, 255, 255, 0.8)' : theme.colors.textSubtle
                            }}>
                                {item.sublabel}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Cost Breakdown */}
            <div style={{ padding: '24px' }}>
                <h3 style={{
                    ...getDashboardTypographyStyle('cardTitle'),
                    margin: '0 0 16px 0',
                    color: theme.colors.text
                }}>Cost Breakdown</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {costBreakdown.map((item, index) => (
                        <div key={index}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '6px'
                            }}>
                                <span style={{
                                    ...getDashboardTypographyStyle('bodyText'),
                                    color: theme.colors.text
                                }}>
                                    {item.label}
                                </span>
                                <span style={{
                                    ...getDashboardTypographyStyle('bodyText'),
                                    color: theme.colors.text,
                                    fontWeight: 600
                                }}>
                                    £{item.value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div style={{
                                height: '8px',
                                background: theme.colors.bg,
                                borderRadius: theme.radii.full,
                                overflow: 'hidden'
                            }}>
                                <div style={{
                                    height: '100%',
                                    width: `${item.percentage}%`,
                                    background: index === 0 ? theme.colors.accent : theme.colors.textSubtle,
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Service Inclusions */}
            {(details.upliftViaStairs || details.extendedUplift || details.specialistReworking) && (
                <div style={{
                    padding: '20px 24px',
                    borderTop: `1px solid ${theme.colors.border}`,
                    background: theme.colors.panelAlt
                }}>
                    <h4 style={{
                        ...getDashboardTypographyStyle('labelText'),
                        margin: '0 0 12px 0',
                        color: theme.colors.textSubtle,
                        textTransform: 'uppercase',
                        fontSize: '12px',
                        letterSpacing: '0.5px'
                    }}>Service Inclusions</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {details.upliftViaStairs && (
                            <div style={{
                                padding: '6px 12px',
                                background: theme.colors.accent,
                                borderRadius: theme.radii.full,
                                color: 'white',
                                fontSize: '13px',
                                fontWeight: 500
                            }}>
                                🏃 Stairs Uplift
                            </div>
                        )}
                        {details.extendedUplift && (
                            <div style={{
                                padding: '6px 12px',
                                background: theme.colors.accent,
                                borderRadius: theme.radii.full,
                                color: 'white',
                                fontSize: '13px',
                                fontWeight: 500
                            }}>
                                🏢 Extended Uplift
                            </div>
                        )}
                        {details.specialistReworking && (
                            <div style={{
                                padding: '6px 12px',
                                background: theme.colors.accentAlt,
                                borderRadius: theme.radii.full,
                                color: 'white',
                                fontSize: '13px',
                                fontWeight: 500
                            }}>
                                🔧 Specialist Rework
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};