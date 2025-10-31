

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
    const { crew } = results;
    
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
                    <span style={{ fontWeight: 700, color: theme.colors.text }}>{(crew.totalProjectDays || 0).toFixed(2)} calendar days</span>
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
            <div className="space-y-6">
                <QuoteSummaryCard
                    results={results}
                    details={quoteDetails}
                />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard title="Total Install Time" value={`${labour.bufferedHours.toFixed(2)} hrs`} description={`Incl. uplift & duration buffers`}>
                    <ClockIcon {...getIconProps('feature', { color: '#3b82f6' })} />
                </StatCard>
                
                <div className="md:col-span-1">
                   <CrewCard results={results} details={quoteDetails} onDetailsChange={onDetailsChange} />
                </div>
                
                <StatCard title="Waste Removal" value={`${waste.loadsRequired.toFixed(2)} loads`} description={`${waste.totalVolumeM3.toFixed(2)} m³ total`}>
                    <TrashIcon {...getIconProps('feature', { color: '#f97316' })} />
                </StatCard>
            </div>
            
             <div className="space-y-3">
                <div className="flex flex-wrap gap-3">
                    {results.crew.isTwoManVanRequired && !quoteDetails.overrideVanType && (
                        <div className="flex items-center bg-yellow-100 text-yellow-800 text-sm font-medium px-3 py-1.5 rounded-full">
                            <ExclamationTriangleIcon className="h-5 w-5 mr-2"/> Auto: 2-Man Van Required
                        </div>
                    )}
                    {waste.isFlagged && (
                        <div className="flex items-center bg-red-100 text-red-800 text-sm font-medium px-3 py-1.5 rounded-full">
                            <ExclamationTriangleIcon className="h-5 w-5 mr-2"/> High Waste Volume Flagged
                        </div>
                    )}
                     {results.crew.supervisorCount > 0 && quoteDetails.overrideSupervisorCount === null && (
                        <div className="flex items-center bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1.5 rounded-full">
                            <UsersIcon className="h-5 w-5 mr-2"/> Auto: Supervisor Included
                        </div>
                    )}
                </div>
                 {(quoteDetails.upliftViaStairs || quoteDetails.extendedUplift || quoteDetails.specialistReworking) && (
                 <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-800">Services & Conditions Applied:</h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-2">
                             {quoteDetails.upliftViaStairs && <div className="flex items-center text-blue-700 text-sm font-medium"><StairsIcon className="h-5 w-5 mr-1.5"/> Uplift via stairs</div>}
                            {quoteDetails.extendedUplift && <div className="flex items-center text-blue-700 text-sm font-medium"><TruckIcon className="h-5 w-5 mr-1.5"/> Extended uplift</div>}
                            {quoteDetails.specialistReworking && <div className="flex items-center text-blue-700 text-sm font-medium"><WrenchScrewdriverIcon className="h-5 w-5 mr-1.5"/> Specialist Reworking</div>}
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
            <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Labour Analysis</h3>
                    <p className="text-sm text-gray-500">Team composition and workload distribution.</p>
                </div>
                <div className="p-4 space-y-4">
                    {/* Hours vs Team Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-gray-50 rounded-lg">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{labour.bufferedHours.toFixed(1)}</div>
                            <div className="text-sm text-gray-600">Total Hours Required</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{results.crew.crewSize}</div>
                            <div className="text-sm text-gray-600">Total Team Size</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{(results.crew.totalProjectDays || 0).toFixed(1)}</div>
                            <div className="text-sm text-gray-600">Total Project Days</div>
                        </div>
                    </div>

                    {/* Individual Labour Split */}
                    <div className="space-y-3">
                        <h4 className="font-semibold text-gray-800">Individual Labour Split</h4>
                        <div className="space-y-2">
                            {/* Van Fitters */}
                            {results.crew.vanFitters > 0 && (
                                <div className="flex justify-between items-center p-2 bg-blue-50 rounded">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                        <span className="font-medium text-gray-700">Van Fitters ({results.crew.vanFitters})</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">{(results.crew.hourLoadPerPerson || 0).toFixed(1)} hrs each</div>
                                        <div className="text-sm text-gray-600">{((results.crew.hourLoadPerPerson || 0) * (results.crew.vanFitters || 0)).toFixed(1)} total hrs</div>
                                    </div>
                                </div>
                            )}

                            {/* On-foot Fitters */}
                            {results.crew.onFootFitters > 0 && (
                                <div className="flex justify-between items-center p-2 bg-green-50 rounded">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                        <span className="font-medium text-gray-700">Walking Fitters ({results.crew.onFootFitters})</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">{(results.crew.hourLoadPerPerson || 0).toFixed(1)} hrs each</div>
                                        <div className="text-sm text-gray-600">{((results.crew.hourLoadPerPerson || 0) * (results.crew.onFootFitters || 0)).toFixed(1)} total hrs</div>
                                    </div>
                                </div>
                            )}

                            {/* Supervisors */}
                            {results.crew.supervisorCount > 0 && (
                                <div className="flex justify-between items-center p-2 bg-purple-50 rounded">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                                        <span className="font-medium text-gray-700">Supervisors ({results.crew.supervisorCount})</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">{(results.crew.hourLoadPerPerson || 0).toFixed(1)} hrs each</div>
                                        <div className="text-sm text-gray-600">{((results.crew.hourLoadPerPerson || 0) * (results.crew.supervisorCount || 0)).toFixed(1)} total hrs</div>
                                    </div>
                                </div>
                            )}

                            {/* Specialists */}
                            {results.crew.specialistCount > 0 && (
                                <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                        <span className="font-medium text-gray-700">Specialists ({results.crew.specialistCount})</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-semibold">{(results.crew.hourLoadPerPerson || 0).toFixed(1)} hrs each</div>
                                        <div className="text-sm text-gray-600">{((results.crew.hourLoadPerPerson || 0) * (results.crew.specialistCount || 0)).toFixed(1)} total hrs</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Time Analysis */}
                        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <h5 className="font-medium text-gray-700 mb-2">Time Analysis</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Base Install Time:</span>
                                        <span className="font-medium">{labour.totalHours.toFixed(1)} hrs</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Uplift Buffer ({labour.upliftBufferPercentage}%):</span>
                                        <span className="font-medium">+{(labour.hoursAfterUplift - labour.totalHours).toFixed(1)} hrs</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Duration Buffer ({labour.durationBufferPercentage}%):</span>
                                        <span className="font-medium">+{(labour.bufferedHours - labour.hoursAfterUplift).toFixed(1)} hrs</span>
                                    </div>
                                    <div className="flex justify-between font-semibold">
                                        <span className="text-gray-700">Total Buffered:</span>
                                        <span>{labour.bufferedHours.toFixed(1)} hrs</span>
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
            <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Edit Installation Times</h3>
                    <p className="text-sm text-gray-500">Adjust individual product installation times if needed.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Line</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Code</th>
                                <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                                <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Time/Unit (hrs)</th>
                                <th scope="col" className="relative px-4 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {sortedProducts.map((item) => {
                                let sourceIcon;
                                let sourceTitle = '';
                                switch(item.source) {
                                    case 'catalogue':
                                        sourceIcon = <BookOpenIcon className="h-5 w-5 text-blue-500" />;
                                        sourceTitle = 'From Product Catalogue';
                                        break;
                                    case 'learned':
                                        sourceIcon = <BrainIcon className="h-5 w-5 text-purple-500" />;
                                        sourceTitle = 'From Learned Data';
                                        break;
                                    case 'user-inputted':
                                        sourceIcon = <PencilIcon className="h-5 w-5 text-yellow-600" />;
                                        sourceTitle = 'Manually Edited/Entered';
                                        break;
                                    default:
                                        sourceIcon = <HelpCircleIcon className="h-5 w-5 text-gray-400" />;
                                        sourceTitle = 'Default/Unknown';
                                        break;
                                }
                                const isEditing = editingTimes[item.lineNumber] !== undefined;

                                return (
                                <tr key={item.lineNumber}>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {item.lineNumber === 999 ? 'END' : item.lineNumber}
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{item.productCode}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.quantity}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                        <div title={sourceTitle} className="flex justify-center">
                                            {sourceIcon}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={editingTimes[item.lineNumber] ?? item.timePerUnit.toFixed(2)}
                                                onChange={(e) => handleTimeChange(item.lineNumber, e.target.value)}
                                                onBlur={() => handleTimeBlur(item.lineNumber)}
                                                className={`w-24 px-2 py-1 border rounded-md shadow-sm text-center text-sm ${item.isManuallyEdited || isEditing ? 'bg-yellow-100 border-yellow-400 font-semibold' : 'border-gray-300'}`}
                                            />
                                            {item.isManuallyEdited && (
                                                <button
                                                    onClick={() => onSaveLearnedProduct(item)}
                                                    className="text-gray-400 hover:text-blue-600 p-1 rounded-full hover:bg-blue-100 transition-colors"
                                                    title={`Save ${item.timePerUnit.toFixed(2)}h for ${item.productCode}`}
                                                >
                                                    <SaveIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 whitespace-nowrap text-center">
                                        <button
                                            onClick={() => handleRemoveProduct(item.lineNumber)}
                                            className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-100 transition-colors"
                                            title="Remove Item"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
                 {products.length === 0 && <p className="p-4 text-center text-gray-500">No valid product lines were found.</p>}
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