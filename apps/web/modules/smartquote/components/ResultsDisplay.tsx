

import React, { useState, useMemo } from 'react';

import { useFeatureFlag, FEATURE_FLAGS } from '../../../lib/featureFlags';
import { theme } from '../../../lib/theme';
import { CalculatedProduct, CalculationResults, QuoteDetails, AppConfig } from '../types';
import { getDashboardCardStyle, getDashboardTypographyStyle, spacing } from '../utils/dashboardStyles';
import { getIconProps } from '../utils/iconSizing';

import { ClockIcon, UsersIcon, TrashIcon, ExclamationTriangleIcon, StairsIcon, TruckIcon, CurrencyPoundIcon, WrenchScrewdriverIcon, ArrowUturnLeftIcon, BookOpenIcon, BrainIcon, PencilIcon, HelpCircleIcon, SaveIcon } from './icons';
import { ProductCrossCheck } from './ProductCrossCheck';
import { NotesDisplay } from './NotesDisplay';
import { ProductsTable } from './ProductsTable';
import { QuoteSummaryCard } from './QuoteSummaryCard';

interface ResultsDisplayProps {
    products: CalculatedProduct[];
    results: CalculationResults;
    quoteDetails: QuoteDetails;
    config: AppConfig;
    onDetailsChange: (details: QuoteDetails) => void;
    onProductsChange: (products: CalculatedProduct[]) => void;
    onSaveLearnedProduct: (product: CalculatedProduct) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; description: string; children?: React.ReactNode; isPrimary?: boolean }> = ({ title, value, description, children, isPrimary=false }) => {
    return (
        <div style={{
            ...getDashboardCardStyle('standard'),
            border: `1px solid ${isPrimary ? theme.colors.accent : theme.colors.border}`,
            background: isPrimary ? theme.colors.accent : theme.colors.panel,
            color: isPrimary ? "white" : theme.colors.text,
            minHeight: '120px'
        }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                color: isPrimary ? "rgba(255,255,255,0.8)" : theme.colors.textSubtle,
                ...spacing.small
            }}>
                {children}
                <h3 style={{
                    ...getDashboardTypographyStyle('labelText'),
                    marginLeft: 8,
                    margin: 0,
                    color: isPrimary ? "rgba(255,255,255,0.8)" : theme.colors.textSubtle
                }}>{title}</h3>
            </div>
            <p style={{
                ...getDashboardTypographyStyle('cardTitle'),
                fontSize: '18px',
                fontWeight: 700,
                margin: 0,
                ...spacing.small
            }}>{value}</p>
            <p style={{
                ...getDashboardTypographyStyle('smallText'),
                margin: 0,
                color: isPrimary ? "rgba(255,255,255,0.7)" : theme.colors.textSubtle
            }}>{description}</p>
        </div>
    );
};

const CrewCard: React.FC<{ results: CalculationResults; details: QuoteDetails; onDetailsChange: (details: QuoteDetails) => void }> = ({ results, details, onDetailsChange }) => {
    const { crew, labour } = results;
    
    const isOverridden = details.overrideFitterCount != null || details.overrideSupervisorCount != null || details.overrideVanType != null;
    
    const handleOverride = (field: keyof QuoteDetails, value: number | 'oneMan' | 'twoMan' | null) => {
        onDetailsChange({ ...details, [field]: value });
    };

    const resetOverrides = () => {
        onDetailsChange({
            ...details,
            overrideFitterCount: null,
            overrideSupervisorCount: null,
            overrideVanType: null,
        });
    };
    
    return (
        <div style={{
            ...getDashboardCardStyle('standard')
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                     <div style={{ display: "flex", alignItems: "center", color: theme.colors.textSubtle }}>
                        <UsersIcon style={{ height: 20, width: 20, color: theme.colors.accentAlt }} />
                        <h3 style={{
                            ...getDashboardTypographyStyle('labelText'),
                            marginLeft: 8,
                            margin: 0
                        }}>Required Crew</h3>
                    </div>
                    <p style={{
                        ...getDashboardTypographyStyle('cardTitle'),
                        fontSize: '18px',
                        fontWeight: 700,
                        margin: '8px 0 0 0',
                        color: theme.colors.text
                    }}>{crew.crewSize} Person Team</p>
                    <p style={{
                        ...getDashboardTypographyStyle('smallText'),
                        color: theme.colors.textSubtle,
                        margin: 0
                    }}>Workload: {(crew.hourLoadPerPerson || 0).toFixed(2)} hours/fitter</p>
                </div>
                {isOverridden && (
                     <button onClick={resetOverrides} style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "4px 8px",
                        fontSize: 12,
                        fontWeight: 500,
                        color: theme.colors.accent,
                        background: `${theme.colors.accent}20`,
                        borderRadius: theme.radii.md,
                        border: "none",
                        cursor: "pointer"
                     }}
                     onMouseOver={(e) => e.currentTarget.style.background = `${theme.colors.accent}30`}
                     onMouseOut={(e) => e.currentTarget.style.background = `${theme.colors.accent}20`}>
                        <ArrowUturnLeftIcon style={{ height: 16, width: 16, marginRight: 4 }}/>
                        Reset
                    </button>
                )}
            </div>
            
             <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12, fontSize: 14 }}>
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: theme.colors.panelAlt,
                    padding: 8,
                    borderRadius: theme.radii.md,
                    border: `1px solid ${theme.colors.border}`
                }}>
                    <span style={{ fontWeight: 500, color: theme.colors.textSubtle }}>Job Duration (On-site):</span>
                    <span style={{ fontWeight: 700, color: theme.colors.text }}>{(labour.bufferedHours / 8).toFixed(1)} calendar days</span>
                </div>
                <div style={{
                    background: theme.colors.panelAlt,
                    padding: 12,
                    borderRadius: theme.radii.md,
                    border: `1px solid ${theme.colors.border}`
                }}>
                    <p style={{ fontWeight: 600, color: theme.colors.text, marginBottom: 4, margin: 0 }}>Team Composition:</p>
                    <div style={{ paddingLeft: 8, color: theme.colors.textSubtle }}>
                        <p style={{ margin: 0 }}><strong style={{ color: theme.colors.text }}>{crew.vanFitters + crew.onFootFitters}</strong> Fitter(s)</p>
                        <p style={{ margin: 0 }}><strong style={{ color: theme.colors.text }}>{crew.supervisorCount}</strong> Supervisor(s)</p>
                        {crew.specialistCount > 0 && <p style={{ margin: 0 }}><strong style={{ color: theme.colors.text }}>{crew.specialistCount}</strong> Specialist(s)</p>}
                    </div>
                </div>
                <div style={{
                    background: theme.colors.panelAlt,
                    padding: 12,
                    borderRadius: theme.radii.md,
                    border: `1px solid ${theme.colors.border}`
                }}>
                    <p style={{ fontWeight: 600, color: theme.colors.text, marginBottom: 4, margin: 0 }}>Van Allocation:</p>
                    <div style={{ paddingLeft: 8, color: theme.colors.textSubtle }}>
                        <p style={{ margin: 0 }}><strong style={{ color: theme.colors.text }}>{crew.vanCount > 0 ? `1 x ${crew.isTwoManVanRequired ? '2-Man Van' : '1-Man Van'}` : 'No Van'}</strong></p>
                        <p style={{ margin: 0 }}>• Van fitters: <strong style={{ color: theme.colors.text }}>{crew.vanFitters}</strong></p>
                        <p style={{ margin: 0 }}>• Walking fitters: <strong style={{ color: theme.colors.text }}>{crew.onFootFitters}</strong></p>
                    </div>
                </div>
            </div>

            <div style={{ height: 1, background: theme.colors.border, margin: "16px 0" }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: theme.colors.text, margin: 0 }}>Crew Override</h4>
                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                        <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: theme.colors.text, marginBottom: 8 }}>Fitters (Total)</label>
                        <input
                            type="number"
                            min="0"
                            placeholder={String(crew.vanFitters + crew.onFootFitters)}
                            value={details.overrideFitterCount ?? ''}
                            onChange={(e) => handleOverride('overrideFitterCount', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                            style={{
                                display: "block",
                                width: "100%",
                                padding: "8px 12px",
                                background: theme.colors.panel,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.radii.md,
                                color: theme.colors.text,
                                fontSize: 14
                            }}
                        />
                    </div>
                     <div>
                        <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: theme.colors.text, marginBottom: 8 }}>Supervisors</label>
                         <input
                            type="number"
                            min="0"
                            placeholder={String(crew.supervisorCount)}
                            value={details.overrideSupervisorCount ?? ''}
                            onChange={(e) => handleOverride('overrideSupervisorCount', e.target.value === '' ? null : parseInt(e.target.value, 10))}
                            style={{
                                display: "block",
                                width: "100%",
                                padding: "8px 12px",
                                background: theme.colors.panel,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.radii.md,
                                color: theme.colors.text,
                                fontSize: 14
                            }}
                        />
                    </div>
                </div>
                <div>
                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: theme.colors.text, marginBottom: 8 }}>Van Type</label>
                     <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        <button
                            type="button"
                            onClick={() => handleOverride('overrideVanType', 'oneMan')}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 12,
                                borderRadius: theme.radii.md,
                                border: `1px solid ${(details.overrideVanType ?? (crew.isTwoManVanRequired ? 'twoMan' : 'oneMan')) === 'oneMan' ? theme.colors.accent : theme.colors.border}`,
                                background: (details.overrideVanType ?? (crew.isTwoManVanRequired ? 'twoMan' : 'oneMan')) === 'oneMan' ? theme.colors.accent : theme.colors.panelAlt,
                                color: (details.overrideVanType ?? (crew.isTwoManVanRequired ? 'twoMan' : 'oneMan')) === 'oneMan' ? "white" : theme.colors.text,
                                cursor: "pointer",
                                fontSize: 14,
                                fontWeight: 500,
                                transition: "all 0.2s ease"
                            }}
                            onMouseOver={(e) => {
                                if ((details.overrideVanType ?? (crew.isTwoManVanRequired ? 'twoMan' : 'oneMan')) !== 'oneMan') {
                                    e.currentTarget.style.background = theme.colors.muted;
                                    e.currentTarget.style.borderColor = theme.colors.accent;
                                }
                            }}
                            onMouseOut={(e) => {
                                if ((details.overrideVanType ?? (crew.isTwoManVanRequired ? 'twoMan' : 'oneMan')) !== 'oneMan') {
                                    e.currentTarget.style.background = theme.colors.panelAlt;
                                    e.currentTarget.style.borderColor = theme.colors.border;
                                }
                            }}
                        >
                            1-Man Van
                        </button>
                         <button
                            type="button"
                            onClick={() => handleOverride('overrideVanType', 'twoMan')}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: 12,
                                borderRadius: theme.radii.md,
                                border: `1px solid ${(details.overrideVanType ?? (crew.isTwoManVanRequired ? 'twoMan' : 'oneMan')) === 'twoMan' ? theme.colors.accent : theme.colors.border}`,
                                background: (details.overrideVanType ?? (crew.isTwoManVanRequired ? 'twoMan' : 'oneMan')) === 'twoMan' ? theme.colors.accent : theme.colors.panelAlt,
                                color: (details.overrideVanType ?? (crew.isTwoManVanRequired ? 'twoMan' : 'oneMan')) === 'twoMan' ? "white" : theme.colors.text,
                                cursor: "pointer",
                                fontSize: 14,
                                fontWeight: 500,
                                transition: "all 0.2s ease"
                            }}
                            onMouseOver={(e) => {
                                if ((details.overrideVanType ?? (crew.isTwoManVanRequired ? 'twoMan' : 'oneMan')) !== 'twoMan') {
                                    e.currentTarget.style.background = theme.colors.muted;
                                    e.currentTarget.style.borderColor = theme.colors.accent;
                                }
                            }}
                            onMouseOut={(e) => {
                                if ((details.overrideVanType ?? (crew.isTwoManVanRequired ? 'twoMan' : 'oneMan')) !== 'twoMan') {
                                    e.currentTarget.style.background = theme.colors.panelAlt;
                                    e.currentTarget.style.borderColor = theme.colors.border;
                                }
                            }}
                        >
                             2-Man Van
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ products, results, quoteDetails, config, onDetailsChange, onProductsChange, onSaveLearnedProduct }) => {
    const { labour, waste, pricing } = results;
    const [editingTimes, setEditingTimes] = useState<Record<number, string>>({});

    // Feature flags
    const [productCrossCheckEnabled] = useFeatureFlag(FEATURE_FLAGS.PRODUCT_CROSS_CHECK);
    const [_databaseProductsEnabled] = useFeatureFlag(FEATURE_FLAGS.DATABASE_DRIVEN_PRODUCTS);

    // Memoize expensive calculations
    const sortedProducts = useMemo(() => {
        return [...products].sort((a, b) => a.lineNumber - b.lineNumber);
    }, [products]);

    const totalInstallTime = useMemo(() => {
        return products.reduce((sum, p) => sum + p.totalTime, 0);
    }, [products]);

    const totalWaste = useMemo(() => {
        return products.reduce((sum, p) => sum + p.totalWaste, 0);
    }, [products]);

    const heavyItemsCount = useMemo(() => {
        return products.filter(p => p.isHeavy).length;
    }, [products]);

    const manuallyEditedCount = useMemo(() => {
        return products.filter(p => p.isManuallyEdited).length;
    }, [products]);

    const handleTimeChange = (lineNumber: number, newTimeString: string) => {
        setEditingTimes(prev => ({
            ...prev,
            [lineNumber]: newTimeString,
        }));
    };
    
    const handleTimeBlur = (lineNumber: number) => {
        const newTimeString = editingTimes[lineNumber];
        if (newTimeString === undefined) return;

        const newTime = parseFloat(newTimeString);
        
        setEditingTimes(prev => {
            const newState = {...prev};
            delete newState[lineNumber];
            return newState;
        });

        const originalProduct = products.find(p => p.lineNumber === lineNumber);
        if (!originalProduct || isNaN(newTime) || newTime < 0 || newTime === originalProduct.timePerUnit) {
            return;
        }

        const newProducts = products.map(p => {
            if (p.lineNumber === lineNumber) {
                return {
                    ...p,
                    timePerUnit: newTime,
                    totalTime: p.quantity * newTime,
                    isManuallyEdited: true,
                    source: 'user-inputted' as const,
                };
            }
            return p;
        });
        onProductsChange(newProducts);
    };

    const handleRemoveProduct = (lineNumberToRemove: number) => {
        if (window.confirm('Are you sure you want to remove this line item? This action will recalculate the quote.')) {
            const newProducts = products.filter(p => p.lineNumber !== lineNumberToRemove);
            onProductsChange(newProducts);
        }
    };


    return (
        <>
            {/* Enhanced Quote Summary Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <QuoteSummaryCard
                    results={results}
                    details={quoteDetails}
                />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                <StatCard title="Total Install Time" value={`${labour.bufferedHours.toFixed(2)} hrs`} description={`Incl. uplift & duration buffers`}>
                    <ClockIcon {...getIconProps('feature', { color: theme.colors.accent })} />
                </StatCard>

                <div>
                   <CrewCard results={results} details={quoteDetails} onDetailsChange={onDetailsChange} />
                </div>

                <StatCard title="Waste Removal" value={`${waste.loadsRequired.toFixed(2)} loads`} description={`${waste.totalVolumeM3.toFixed(2)} m³ total`}>
                    <TrashIcon {...getIconProps('feature', { color: theme.colors.warn })} />
                </StatCard>
            </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                    {results.crew.isTwoManVanRequired && !quoteDetails.overrideVanType && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: `${theme.colors.warn}20`,
                            color: theme.colors.warn,
                            fontSize: 14,
                            fontWeight: 500,
                            padding: '6px 12px',
                            borderRadius: '9999px'
                        }}>
                            <ExclamationTriangleIcon style={{ height: 20, width: 20, marginRight: 8 }}/> Auto: 2-Man Van Required
                        </div>
                    )}
                    {waste.isFlagged && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: `${theme.colors.danger}20`,
                            color: theme.colors.danger,
                            fontSize: 14,
                            fontWeight: 500,
                            padding: '6px 12px',
                            borderRadius: '9999px'
                        }}>
                            <ExclamationTriangleIcon style={{ height: 20, width: 20, marginRight: 8 }}/> High Waste Volume Flagged
                        </div>
                    )}
                     {results.crew.supervisorCount > 0 && quoteDetails.overrideSupervisorCount === null && (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: `${theme.colors.accentAlt}20`,
                            color: theme.colors.accentAlt,
                            fontSize: 14,
                            fontWeight: 500,
                            padding: '6px 12px',
                            borderRadius: '9999px'
                        }}>
                            <UsersIcon style={{ height: 20, width: 20, marginRight: 8 }}/> Auto: Supervisor Included
                        </div>
                    )}
                </div>
                 {(quoteDetails.upliftViaStairs || quoteDetails.extendedUplift || quoteDetails.specialistReworking) && (
                 <div style={{
                     background: `${theme.colors.accent}10`,
                     border: `1px solid ${theme.colors.accent}30`,
                     borderRadius: theme.radii.lg,
                     padding: 16
                 }}>
                        <h4 style={{ fontWeight: 600, color: theme.colors.accent, margin: 0 }}>Services & Conditions Applied:</h4>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 8 }}>
                             {quoteDetails.upliftViaStairs && <div style={{ display: 'flex', alignItems: 'center', color: theme.colors.accent, fontSize: 14, fontWeight: 500 }}><StairsIcon style={{ height: 20, width: 20, marginRight: 6 }}/> Uplift via stairs</div>}
                            {quoteDetails.extendedUplift && <div style={{ display: 'flex', alignItems: 'center', color: theme.colors.accent, fontSize: 14, fontWeight: 500 }}><TruckIcon style={{ height: 20, width: 20, marginRight: 6 }}/> Extended uplift</div>}
                            {quoteDetails.specialistReworking && <div style={{ display: 'flex', alignItems: 'center', color: theme.colors.accent, fontSize: 14, fontWeight: 500 }}><WrenchScrewdriverIcon style={{ height: 20, width: 20, marginRight: 6 }}/> Specialist Reworking</div>}
                        </div>
                    </div>
                )}
            </div>

            {/* Pricing Breakdown */}
            <div style={{
                ...getDashboardCardStyle('standard'),
                maxWidth: 'none'
            }}>
                <div style={{ 
                    padding: 16, 
                    borderBottom: `1px solid ${theme.colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12
                }}>
                    <CurrencyPoundIcon {...getIconProps('feature', { color: theme.colors.accent })} />
                    <div>
                        <h3 style={{
                            ...getDashboardTypographyStyle('sectionHeader'),
                            color: theme.colors.text,
                            margin: 0
                        }}>Cost Breakdown</h3>
                        <p style={{
                            ...getDashboardTypographyStyle('bodyText'),
                            color: theme.colors.textSubtle,
                            margin: '4px 0 0 0'
                        }}>Detailed breakdown of all quote costs</p>
                    </div>
                </div>
                
                <div style={{ padding: 16 }}>
                    {/* Main Cost Items */}
                    <div style={{ display: 'grid', gap: 12 }}>
                        {/* Van Cost */}
                        {pricing.vanCost > 0 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 12,
                                background: theme.colors.panelAlt,
                                borderRadius: theme.radii.md,
                                border: `1px solid ${theme.colors.border}`
                            }}>
                                <span style={{
                                    ...getDashboardTypographyStyle('labelText'),
                                    color: theme.colors.text
                                }}>Van Cost</span>
                                <span style={{
                                    ...getDashboardTypographyStyle('cardTitle'),
                                    color: theme.colors.accent
                                }}>£{pricing.vanCost.toFixed(2)}</span>
                            </div>
                        )}

                        {/* Additional Fitters */}
                        {pricing.fitterCost > 0 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 12,
                                background: theme.colors.panelAlt,
                                borderRadius: theme.radii.md,
                                border: `1px solid ${theme.colors.border}`
                            }}>
                                <span style={{
                                    ...getDashboardTypographyStyle('labelText'),
                                    color: theme.colors.text
                                }}>Additional Fitters</span>
                                <span style={{
                                    ...getDashboardTypographyStyle('cardTitle'),
                                    color: theme.colors.accent
                                }}>£{pricing.fitterCost.toFixed(2)}</span>
                            </div>
                        )}

                        {/* Supervisors */}
                        {pricing.supervisorCost > 0 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 12,
                                background: theme.colors.panelAlt,
                                borderRadius: theme.radii.md,
                                border: `1px solid ${theme.colors.border}`
                            }}>
                                <span style={{
                                    ...getDashboardTypographyStyle('labelText'),
                                    color: theme.colors.text
                                }}>Supervisors</span>
                                <span style={{
                                    ...getDashboardTypographyStyle('cardTitle'),
                                    color: theme.colors.accent
                                }}>£{pricing.supervisorCost.toFixed(2)}</span>
                            </div>
                        )}

                        {/* Specialist Work */}
                        {pricing.reworkingCost > 0 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 12,
                                background: theme.colors.panelAlt,
                                borderRadius: theme.radii.md,
                                border: `1px solid ${theme.colors.border}`
                            }}>
                                <span style={{
                                    ...getDashboardTypographyStyle('labelText'),
                                    color: theme.colors.text
                                }}>Specialist Work</span>
                                <span style={{
                                    ...getDashboardTypographyStyle('cardTitle'),
                                    color: theme.colors.accent
                                }}>£{pricing.reworkingCost.toFixed(2)}</span>
                            </div>
                        )}

                        {/* Parking */}
                        {pricing.parkingCost > 0 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 12,
                                background: theme.colors.panelAlt,
                                borderRadius: theme.radii.md,
                                border: `1px solid ${theme.colors.border}`
                            }}>
                                <span style={{
                                    ...getDashboardTypographyStyle('labelText'),
                                    color: theme.colors.text
                                }}>Parking</span>
                                <span style={{
                                    ...getDashboardTypographyStyle('cardTitle'),
                                    color: theme.colors.accent
                                }}>£{pricing.parkingCost.toFixed(2)}</span>
                            </div>
                        )}

                        {/* Out-of-Hours Surcharge */}
                        {pricing.outOfHoursSurcharge && pricing.outOfHoursSurcharge > 0 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 12,
                                background: '#fff3cd',
                                borderRadius: theme.radii.md,
                                border: `1px solid #ffeaa7`
                            }}>
                                <div>
                                    <span style={{
                                        ...getDashboardTypographyStyle('labelText'),
                                        color: '#856404',
                                        fontWeight: 600
                                    }}>
                                        Out-of-Hours Surcharge 
                                        {pricing.outOfHoursMultiplier && (
                                            <span style={{ fontWeight: 400, fontSize: 12 }}>
                                                {' '}({Math.round((pricing.outOfHoursMultiplier - 1) * 100)}% premium)
                                            </span>
                                        )}
                                    </span>
                                    {pricing.standardCost && (
                                        <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2 }}>
                                            Standard cost: £{pricing.standardCost.toFixed(2)}
                                        </div>
                                    )}
                                </div>
                                <span style={{
                                    ...getDashboardTypographyStyle('cardTitle'),
                                    color: '#d63384',
                                    fontWeight: 700
                                }}>+£{pricing.outOfHoursSurcharge.toFixed(2)}</span>
                            </div>
                        )}

                        {/* Transport Section */}
                        {Object.keys(quoteDetails.selectedVehicles || {}).length > 0 && (
                            <div style={{
                                padding: 12,
                                background: theme.colors.panelAlt,
                                borderRadius: theme.radii.md,
                                border: `1px solid ${theme.colors.border}`
                            }}>
                                <div style={{
                                    ...getDashboardTypographyStyle('labelText'),
                                    color: theme.colors.text,
                                    marginBottom: 8
                                }}>Transport Vehicles</div>
                                <div style={{ display: 'grid', gap: 6 }}>
                                    {Object.entries(quoteDetails.selectedVehicles || {}).map(([vehicleId, quantity]) => {
                                        const vehicle = config.vehicles[vehicleId];
                                        if (!vehicle || quantity <= 0) return null;
                                        return (
                                            <div key={vehicleId} style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: 8,
                                                background: theme.colors.panel,
                                                borderRadius: 4,
                                                border: `1px solid ${theme.colors.border}`
                                            }}>
                                                <span style={{
                                                    fontSize: 13,
                                                    color: theme.colors.textSubtle
                                                }}>
                                                    {quantity}× {vehicle.name}
                                                </span>
                                                <span style={{
                                                    fontSize: 13,
                                                    fontWeight: 600,
                                                    color: theme.colors.accent
                                                }}>
                                                    £{(vehicle.costPerDay * quantity * pricing.billableDays).toFixed(2)}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Total */}
                    <div style={{
                        marginTop: 16,
                        paddingTop: 16,
                        borderTop: `2px solid ${theme.colors.border}`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <span style={{
                            ...getDashboardTypographyStyle('sectionHeader'),
                            color: theme.colors.text
                        }}>Total Quote Cost</span>
                        <span style={{
                            ...getDashboardTypographyStyle('sectionHeader'),
                            color: theme.colors.accent,
                            fontSize: '1.5rem'
                        }}>£{pricing.totalCost.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Labour Breakdown */}
            <div style={{
                ...getDashboardCardStyle('standard'),
                maxWidth: 'none'
            }}>
                <div style={{
                    padding: 16,
                    borderBottom: `1px solid ${theme.colors.border}`
                }}>
                    <h3 style={{
                        ...getDashboardTypographyStyle('sectionHeader'),
                        color: theme.colors.text,
                        margin: 0
                    }}>Labour Analysis</h3>
                    <p style={{
                        ...getDashboardTypographyStyle('smallText'),
                        color: theme.colors.textSubtle,
                        margin: '4px 0 0 0'
                    }}>Team composition and workload distribution.</p>
                </div>
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Hours vs Team Summary */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: 16,
                        padding: 12,
                        background: theme.colors.panelAlt,
                        borderRadius: theme.radii.lg
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 700, color: theme.colors.accent }}>{labour.bufferedHours.toFixed(1)}</div>
                            <div style={{ fontSize: 14, color: theme.colors.textSubtle }}>Total Hours Required</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 700, color: theme.colors.accentAlt }}>{results.crew.crewSize}</div>
                            <div style={{ fontSize: 14, color: theme.colors.textSubtle }}>Total Team Size</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 28, fontWeight: 700, color: theme.colors.warn }}>{(results.labour.bufferedHours / 8).toFixed(1)}</div>
                            <div style={{ fontSize: 14, color: theme.colors.textSubtle }}>Total Project Days</div>
                        </div>
                    </div>

                    {/* Individual Labour Split */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <h4 style={{
                            fontWeight: 600,
                            color: theme.colors.text,
                            margin: 0
                        }}>Individual Labour Split</h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {/* Van Fitters */}
                            {results.crew.vanFitters > 0 && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 8,
                                    background: `${theme.colors.accent}10`,
                                    borderRadius: theme.radii.md
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            width: 12,
                                            height: 12,
                                            background: theme.colors.accent,
                                            borderRadius: '50%'
                                        }}></div>
                                        <span style={{ fontWeight: 500, color: theme.colors.text }}>Van Fitters ({results.crew.vanFitters})</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600, color: theme.colors.text }}>{(results.crew.hourLoadPerPerson || 0).toFixed(1)} hrs each</div>
                                        <div style={{ fontSize: 14, color: theme.colors.textSubtle }}>{((results.crew.hourLoadPerPerson || 0) * (results.crew.vanFitters || 0)).toFixed(1)} total hrs</div>
                                    </div>
                                </div>
                            )}

                            {/* On-foot Fitters */}
                            {results.crew.onFootFitters > 0 && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 8,
                                    background: `${theme.colors.accentAlt}10`,
                                    borderRadius: theme.radii.md
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            width: 12,
                                            height: 12,
                                            background: theme.colors.accentAlt,
                                            borderRadius: '50%'
                                        }}></div>
                                        <span style={{ fontWeight: 500, color: theme.colors.text }}>Walking Fitters ({results.crew.onFootFitters})</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600, color: theme.colors.text }}>{(results.crew.hourLoadPerPerson || 0).toFixed(1)} hrs each</div>
                                        <div style={{ fontSize: 14, color: theme.colors.textSubtle }}>{((results.crew.hourLoadPerPerson || 0) * (results.crew.onFootFitters || 0)).toFixed(1)} total hrs</div>
                                    </div>
                                </div>
                            )}

                            {/* Supervisors */}
                            {results.crew.supervisorCount > 0 && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 8,
                                    background: `${theme.colors.accentAlt}10`,
                                    borderRadius: theme.radii.md
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            width: 12,
                                            height: 12,
                                            background: theme.colors.accentAlt,
                                            borderRadius: '50%'
                                        }}></div>
                                        <span style={{ fontWeight: 500, color: theme.colors.text }}>Supervisors ({results.crew.supervisorCount})</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600, color: theme.colors.text }}>{(results.crew.hourLoadPerPerson || 0).toFixed(1)} hrs each</div>
                                        <div style={{ fontSize: 14, color: theme.colors.textSubtle }}>{((results.crew.hourLoadPerPerson || 0) * (results.crew.supervisorCount || 0)).toFixed(1)} total hrs</div>
                                    </div>
                                </div>
                            )}

                            {/* Specialists */}
                            {results.crew.specialistCount > 0 && (
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 8,
                                    background: `${theme.colors.warn}10`,
                                    borderRadius: theme.radii.md
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{
                                            width: 12,
                                            height: 12,
                                            background: theme.colors.warn,
                                            borderRadius: '50%'
                                        }}></div>
                                        <span style={{ fontWeight: 500, color: theme.colors.text }}>Specialists ({results.crew.specialistCount})</span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontWeight: 600, color: theme.colors.text }}>{(results.crew.hourLoadPerPerson || 0).toFixed(1)} hrs each</div>
                                        <div style={{ fontSize: 14, color: theme.colors.textSubtle }}>{((results.crew.hourLoadPerPerson || 0) * (results.crew.specialistCount || 0)).toFixed(1)} total hrs</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Time Analysis */}
                        <div style={{
                            marginTop: 16,
                            padding: 12,
                            background: theme.colors.panelAlt,
                            borderRadius: theme.radii.lg
                        }}>
                            <h5 style={{ fontWeight: 500, color: theme.colors.text, marginBottom: 8, margin: 0 }}>Time Analysis</h5>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                                gap: 16,
                                fontSize: 14
                            }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: theme.colors.textSubtle }}>Base Install Time:</span>
                                        <span style={{ fontWeight: 500, color: theme.colors.text }}>{labour.totalHours.toFixed(1)} hrs</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: theme.colors.textSubtle }}>Uplift Buffer ({labour.upliftBufferPercentage}%):</span>
                                        <span style={{ fontWeight: 500, color: theme.colors.text }}>+{(labour.hoursAfterUplift - labour.totalHours).toFixed(1)} hrs</span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: theme.colors.textSubtle }}>Duration Buffer ({labour.durationBufferPercentage}%):</span>
                                        <span style={{ fontWeight: 500, color: theme.colors.text }}>+{(labour.bufferedHours - labour.hoursAfterUplift).toFixed(1)} hrs</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                                        <span style={{ color: theme.colors.text }}>Total Buffered:</span>
                                        <span style={{ color: theme.colors.accent }}>{labour.bufferedHours.toFixed(1)} hrs</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Enhanced Product Schedule Table */}
            <ProductsTable
                products={products}
                showTimeColumn={true}
                isPowerGrouped={products.some(p => p.lineNumber === 999)}
            />

            {/* Editable Installation Times Section */}
            <div style={{
                ...getDashboardCardStyle('standard'),
                overflow: 'hidden',
                maxWidth: 'none'
            }}>
                <div style={{
                    padding: 16,
                    borderBottom: `1px solid ${theme.colors.border}`
                }}>
                    <h3 style={{
                        ...getDashboardTypographyStyle('sectionHeader'),
                        color: theme.colors.text,
                        margin: 0
                    }}>Edit Installation Times</h3>
                    <p style={{
                        ...getDashboardTypographyStyle('smallText'),
                        color: theme.colors.textSubtle,
                        margin: '4px 0 0 0'
                    }}>Adjust individual product installation times if needed.</p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: theme.colors.panelAlt }}>
                            <tr>
                                <th style={{
                                    padding: '12px 16px',
                                    textAlign: 'left',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: theme.colors.textSubtle,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    borderBottom: `1px solid ${theme.colors.border}`
                                }}>Line</th>
                                <th style={{
                                    padding: '12px 16px',
                                    textAlign: 'left',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: theme.colors.textSubtle,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    borderBottom: `1px solid ${theme.colors.border}`
                                }}>Product Code</th>
                                <th style={{
                                    padding: '12px 16px',
                                    textAlign: 'left',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: theme.colors.textSubtle,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    borderBottom: `1px solid ${theme.colors.border}`
                                }}>Qty</th>
                                <th style={{
                                    padding: '12px 16px',
                                    textAlign: 'center',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: theme.colors.textSubtle,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    borderBottom: `1px solid ${theme.colors.border}`
                                }}>Source</th>
                                <th style={{
                                    padding: '12px 16px',
                                    textAlign: 'center',
                                    fontSize: 12,
                                    fontWeight: 500,
                                    color: theme.colors.textSubtle,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                    borderBottom: `1px solid ${theme.colors.border}`
                                }}>Time/Unit (hrs)</th>
                                <th style={{
                                    padding: '12px 16px',
                                    borderBottom: `1px solid ${theme.colors.border}`
                                }}><span style={{ visibility: 'hidden' }}>Actions</span></th>
                            </tr>
                        </thead>
                        <tbody style={{ background: theme.colors.panel }}>
                            {sortedProducts.map((item) => {
                                let sourceIcon;
                                let sourceTitle = '';
                                switch(item.source) {
                                    case 'catalogue':
                                        sourceIcon = <BookOpenIcon style={{ height: 20, width: 20, color: theme.colors.accent }} />;
                                        sourceTitle = 'From Product Catalogue';
                                        break;
                                    case 'learned':
                                        sourceIcon = <BrainIcon style={{ height: 20, width: 20, color: theme.colors.accentAlt }} />;
                                        sourceTitle = 'From Learned Data';
                                        break;
                                    case 'user-inputted':
                                        sourceIcon = <PencilIcon style={{ height: 20, width: 20, color: theme.colors.warn }} />;
                                        sourceTitle = 'Manually Edited/Entered';
                                        break;
                                    default:
                                        sourceIcon = <HelpCircleIcon style={{ height: 20, width: 20, color: theme.colors.textSubtle }} />;
                                        sourceTitle = 'Default/Unknown';
                                        break;
                                }
                                const isEditing = editingTimes[item.lineNumber] !== undefined;

                                return (
                                <tr key={item.lineNumber} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                    <td style={{
                                        padding: '16px',
                                        whiteSpace: 'nowrap',
                                        fontSize: 14,
                                        color: theme.colors.textSubtle
                                    }}>
                                        {item.lineNumber === 999 ? 'END' : item.lineNumber}
                                    </td>
                                    <td style={{
                                        padding: '16px',
                                        whiteSpace: 'nowrap',
                                        fontSize: 14,
                                        fontFamily: 'monospace',
                                        color: theme.colors.text
                                    }}>{item.productCode}</td>
                                    <td style={{
                                        padding: '16px',
                                        whiteSpace: 'nowrap',
                                        fontSize: 14,
                                        fontWeight: 500,
                                        color: theme.colors.text
                                    }}>{item.quantity}</td>
                                    <td style={{
                                        padding: '16px',
                                        whiteSpace: 'nowrap',
                                        textAlign: 'center'
                                    }}>
                                        <div title={sourceTitle} style={{ display: 'flex', justifyContent: 'center' }}>
                                            {sourceIcon}
                                        </div>
                                    </td>
                                    <td style={{
                                        padding: '16px',
                                        whiteSpace: 'nowrap',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={editingTimes[item.lineNumber] ?? item.timePerUnit.toFixed(2)}
                                                onChange={(e) => handleTimeChange(item.lineNumber, e.target.value)}
                                                onBlur={() => handleTimeBlur(item.lineNumber)}
                                                style={{
                                                    width: 96,
                                                    padding: '4px 8px',
                                                    border: item.isManuallyEdited || isEditing
                                                        ? `2px solid ${theme.colors.warn}`
                                                        : `1px solid ${theme.colors.border}`,
                                                    borderRadius: theme.radii.md,
                                                    boxShadow: theme.shadow,
                                                    textAlign: 'center',
                                                    fontSize: 14,
                                                    background: item.isManuallyEdited || isEditing
                                                        ? `${theme.colors.warn}20`
                                                        : theme.colors.panel,
                                                    fontWeight: item.isManuallyEdited || isEditing ? 600 : 400,
                                                    color: theme.colors.text,
                                                    outline: 'none',
                                                    transition: 'all 0.2s ease'
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = theme.colors.accent;
                                                    e.target.style.boxShadow = `0 0 0 2px ${theme.colors.accent}20`;
                                                }}
                                            />
                                            {item.isManuallyEdited && (
                                                <button
                                                    onClick={() => onSaveLearnedProduct(item)}
                                                    title={`Save ${item.timePerUnit.toFixed(2)}h for ${item.productCode}`}
                                                    style={{
                                                        color: theme.colors.textSubtle,
                                                        padding: 4,
                                                        borderRadius: '50%',
                                                        background: 'transparent',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.3s ease'
                                                    }}
                                                    onMouseOver={(e) => {
                                                        e.currentTarget.style.color = theme.colors.accent;
                                                        e.currentTarget.style.background = `${theme.colors.accent}10`;
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.currentTarget.style.color = theme.colors.textSubtle;
                                                        e.currentTarget.style.background = 'transparent';
                                                    }}
                                                >
                                                    <SaveIcon style={{ height: 20, width: 20 }} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{
                                        padding: '16px',
                                        whiteSpace: 'nowrap',
                                        textAlign: 'center'
                                    }}>
                                        <button
                                            onClick={() => handleRemoveProduct(item.lineNumber)}
                                            title="Remove Item"
                                            style={{
                                                color: theme.colors.textSubtle,
                                                padding: 4,
                                                borderRadius: '50%',
                                                background: 'transparent',
                                                border: 'none',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease'
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.color = theme.colors.danger;
                                                e.currentTarget.style.background = `${theme.colors.danger}10`;
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.color = theme.colors.textSubtle;
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                        >
                                            <TrashIcon style={{ height: 20, width: 20 }} />
                                        </button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                 {products.length === 0 && <p style={{
                     padding: 16,
                     textAlign: 'center',
                     color: theme.colors.textSubtle
                 }}>No valid product lines were found.</p>}
            </div>

            {/* Product Cross-Check Section */}
            {products.length > 0 && productCrossCheckEnabled && (
                <ProductCrossCheck
                    products={products}
                    onProductUpdate={(lineNumber, updates) => {
                        const newProducts = products.map(p => {
                            if (p.lineNumber === lineNumber) {
                                return { ...p, ...updates };
                            }
                            return p;
                        });
                        onProductsChange(newProducts);
                    }}
                    onProductValidated={(_lineNumber, _validatedData) => {
                        // This callback can be used for additional validation logic if needed
                        // console.log(`Product ${lineNumber} validated:`, validatedData);
                    }}
                />
            )}

            {/* Notes Section - Clean display for additional information */}
            <NotesDisplay
                notes={results.notes || {}}
                onNotesChange={(updatedNotes) => {
                    // Save notes to results
                    const updatedResults = {
                        ...results,
                        notes: updatedNotes
                    };
                    // Trigger update through parent component
                    if (onDetailsChange) {
                        onDetailsChange({
                            ...quoteDetails,
                            // Store notes in quote details for persistence
                            notes: updatedNotes
                        } as any);
                    }
                }}
                editable={true}
            />
            </div>
        </>
    );
};