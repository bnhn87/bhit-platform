import React, { useState, useMemo } from 'react';

import { theme } from '../../../lib/theme';
import { useBreakpoint, useIsMobile, useIsTouchDevice } from '../hooks/useResponsive';
import { ParsedProduct, ProductReference, AppConfig } from '../types';
import { getInputA11yProps, getButtonA11yProps } from '../utils/accessibilityHelpers';
import { getDashboardCardStyle, getDashboardButtonStyle, getDashboardTypographyStyle, getDashboardInputStyle } from '../utils/dashboardStyles';
import { getIconProps } from '../utils/iconSizing';
import { getTouchFriendlyStyles, responsiveSpacing } from '../utils/responsive';

import { HelpCircleIcon as InfoIcon, CheckCircleIcon, XCircleIcon as _XCircleIcon } from './icons';

interface AccessoryReviewPanelProps {
    excludedProducts: ParsedProduct[];
    onSubmit: (selectedProducts: ParsedProduct[], productTimes: Record<string, ProductReference>) => void;
    onSkip: () => void;
    config: AppConfig;
}

type AccessorySelection = {
    include: boolean;
    installTimeHours: string;
    isHeavy: boolean;
};

const normalizeCode = (code: string) => code.toUpperCase().replace(/[\s()-_]/g, '');

export const AccessoryReviewPanel: React.FC<AccessoryReviewPanelProps> = ({
    excludedProducts,
    onSubmit,
    onSkip,
    config
}) => {
    const breakpoint = useBreakpoint();
    const isMobile = useIsMobile();
    const isTouchDevice = useIsTouchDevice();

    const [selections, setSelections] = useState<Record<string, AccessorySelection>>(() => {
        const initial: Record<string, AccessorySelection> = {};
        excludedProducts.forEach(product => {
            const key = normalizeCode(product.productCode);
            initial[key] = {
                include: false,
                installTimeHours: '0.25', // Default reasonable time
                isHeavy: false
            };
        });
        return initial;
    });

    const uniqueProducts = useMemo(() => {
        const seen = new Set<string>();
        return excludedProducts.filter(product => {
            const key = normalizeCode(product.productCode);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }, [excludedProducts]);

    const handleSelectionChange = (productCode: string, field: keyof AccessorySelection, value: boolean | string) => {
        const key = normalizeCode(productCode);
        setSelections(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value
            }
        }));
    };

    const handleSubmit = () => {
        const selectedProducts: ParsedProduct[] = [];
        const productTimes: Record<string, ProductReference> = {};

        uniqueProducts.forEach(product => {
            const key = normalizeCode(product.productCode);
            const selection = selections[key];
            
            if (selection.include) {
                selectedProducts.push(product);
                
                const installTime = parseFloat(selection.installTimeHours);
                if (!isNaN(installTime) && installTime > 0) {
                    productTimes[key] = {
                        installTimeHours: installTime,
                        wasteVolumeM3: config.rules.defaultWasteVolumeM3,
                        isHeavy: selection.isHeavy
                    };
                }
            }
        });

        onSubmit(selectedProducts, productTimes);
    };

    const selectedCount = Object.values(selections).filter(s => s.include).length;
    const hasInvalidTimes = Object.entries(selections).some(([_, selection]) => 
        selection.include && (isNaN(parseFloat(selection.installTimeHours)) || parseFloat(selection.installTimeHours) <= 0)
    );

    if (uniqueProducts.length === 0) {
        // No accessories to review, skip directly
        onSkip();
        return null;
    }

    return (
        <div
            role="region"
            aria-label="Accessory review panel"
            style={{
                ...getDashboardCardStyle('standard'),
                maxWidth: isMobile ? '100%' : '900px',
                margin: '0 auto',
                padding: responsiveSpacing[breakpoint].padding
            }}
        >
            <div style={{ display: "flex", alignItems: "flex-start", gap: isMobile ? 12 : 16, flexDirection: isMobile ? 'column' : 'row' }}>
                {!isMobile && <InfoIcon {...getIconProps('status', { color: theme.colors.accent })} />}
                <div>
                    <h2
                        id="accessory-panel-title"
                        style={{
                            ...getDashboardTypographyStyle('sectionHeader'),
                            color: theme.colors.text,
                            margin: 0,
                            fontSize: isMobile ? 18 : 20
                        }}
                    >
                        Review Accessories & Optional Items
                    </h2>
                    <p
                        id="accessory-panel-description"
                        style={{
                            ...getDashboardTypographyStyle('bodyText'),
                            color: theme.colors.textSubtle,
                            margin: '4px 0 0 0',
                            fontSize: isMobile ? 13 : 14
                        }}
                    >
                        These items were flagged as accessories (trays, access doors, inserts).
                        Select which ones to include and provide installation times.
                    </p>
                </div>
            </div>

            <div style={{ marginTop: isMobile ? 16 : 24 }}>
                {/* Header - Desktop only */}
                {!isMobile && (
                    <div
                        role="row"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: '60px 1fr 120px 100px 80px',
                            gap: 12,
                            padding: '8px 0',
                            fontSize: 12,
                            fontWeight: 600,
                            color: theme.colors.textSubtle,
                            borderBottom: `1px solid ${theme.colors.border}`
                        }}
                    >
                        <div role="columnheader">Include</div>
                        <div role="columnheader">Product</div>
                        <div role="columnheader">Install Time (hrs)</div>
                        <div role="columnheader">Item Type</div>
                        <div role="columnheader">Qty</div>
                    </div>
                )}

                {/* Product Rows */}
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                    {uniqueProducts.map(product => {
                        const key = normalizeCode(product.productCode);
                        const selection = selections[key];
                        const productInstances = excludedProducts.filter(p => normalizeCode(p.productCode) === key);
                        const totalQuantity = productInstances.reduce((sum, p) => sum + p.quantity, 0);

                        return (
                            <div
                                key={key}
                                role="row"
                                aria-label={`Accessory ${product.productCode}`}
                                style={{
                                    display: isMobile ? 'flex' : 'grid',
                                    flexDirection: isMobile ? 'column' : undefined,
                                    gridTemplateColumns: isMobile ? undefined : '60px 1fr 120px 100px 80px',
                                    gap: isMobile ? 12 : 12,
                                    alignItems: isMobile ? 'stretch' : 'center',
                                    padding: isMobile ? 16 : 12,
                                    background: selection.include ? `${theme.colors.accent}15` : 'transparent',
                                    borderRadius: 6,
                                    border: `1px solid ${selection.include ? theme.colors.accent : theme.colors.border}`
                                }}
                            >
                                {/* Mobile: Top Row with checkbox and product info */}
                                {isMobile ? (
                                    <>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                                            <button
                                                {...getButtonA11yProps({
                                                    label: `${selection.include ? 'Remove' : 'Include'} ${product.productCode}`,
                                                    pressed: selection.include
                                                })}
                                                onClick={() => handleSelectionChange(product.productCode, 'include', !selection.include)}
                                                style={{
                                                    ...getTouchFriendlyStyles(isTouchDevice),
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: 44,
                                                    height: 44,
                                                    minWidth: 44,
                                                    minHeight: 44,
                                                    borderRadius: '50%',
                                                    border: `2px solid ${selection.include ? theme.colors.accent : theme.colors.border}`,
                                                    background: selection.include ? theme.colors.accent : 'transparent',
                                                    cursor: 'pointer',
                                                    flexShrink: 0
                                                }}
                                            >
                                                {selection.include ? (
                                                    <CheckCircleIcon {...getIconProps('status', { color: 'white' })} />
                                                ) : (
                                                    <div style={{ width: 20, height: 20 }} />
                                                )}
                                            </button>

                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    ...getDashboardTypographyStyle('cardTitle'),
                                                    color: theme.colors.text,
                                                    margin: 0,
                                                    fontSize: 16
                                                }}>
                                                    {product.productCode}
                                                </div>
                                                <div style={{
                                                    ...getDashboardTypographyStyle('bodyText'),
                                                    color: theme.colors.textSubtle,
                                                    margin: '4px 0 0 0',
                                                    fontSize: 13
                                                }}>
                                                    {product.cleanDescription}
                                                </div>
                                                <div style={{
                                                    ...getDashboardTypographyStyle('bodyText'),
                                                    color: theme.colors.textSubtle,
                                                    margin: '4px 0 0 0',
                                                    fontSize: 13
                                                }}>
                                                    Quantity: {totalQuantity}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mobile: Controls Row */}
                                        <div style={{ display: 'flex', gap: 12, paddingLeft: 56 }}>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: theme.colors.textSubtle, marginBottom: 4 }}>
                                                    Install Time (hrs)
                                                </label>
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    min="0"
                                                    value={selection.installTimeHours}
                                                    onChange={(e) => handleSelectionChange(product.productCode, 'installTimeHours', e.target.value)}
                                                    disabled={!selection.include}
                                                    {...getInputA11yProps({
                                                        label: `Install time for ${product.productCode}`,
                                                        required: selection.include
                                                    })}
                                                    style={{
                                                        ...getDashboardInputStyle(),
                                                        ...getTouchFriendlyStyles(isTouchDevice),
                                                        width: '100%',
                                                        fontSize: 16,
                                                        opacity: selection.include ? 1 : 0.5,
                                                        cursor: selection.include ? 'text' : 'not-allowed'
                                                    }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: theme.colors.textSubtle, marginBottom: 4 }}>
                                                    Item Type
                                                </label>
                                                <button
                                                    {...getButtonA11yProps({
                                                        label: `Toggle heavy item for ${product.productCode}`,
                                                        pressed: selection.isHeavy,
                                                        disabled: !selection.include
                                                    })}
                                                    onClick={() => handleSelectionChange(product.productCode, 'isHeavy', !selection.isHeavy)}
                                                    disabled={!selection.include}
                                                    style={{
                                                        ...getTouchFriendlyStyles(isTouchDevice),
                                                        width: '100%',
                                                        padding: '10px',
                                                        border: `1px solid ${selection.isHeavy ? theme.colors.accent : theme.colors.border}`,
                                                        borderRadius: 4,
                                                        background: selection.isHeavy ? theme.colors.accent : 'transparent',
                                                        color: selection.isHeavy ? 'white' : theme.colors.text,
                                                        cursor: selection.include ? 'pointer' : 'not-allowed',
                                                        fontSize: 14,
                                                        fontWeight: 500,
                                                        opacity: selection.include ? 1 : 0.5
                                                    }}
                                                >
                                                    {selection.isHeavy ? 'Heavy' : 'Standard'}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {/* Desktop Layout */}
                                        <button
                                            {...getButtonA11yProps({
                                                label: `${selection.include ? 'Remove' : 'Include'} ${product.productCode}`,
                                                pressed: selection.include
                                            })}
                                            onClick={() => handleSelectionChange(product.productCode, 'include', !selection.include)}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: 32,
                                                height: 32,
                                                borderRadius: '50%',
                                                border: `2px solid ${selection.include ? theme.colors.accent : theme.colors.border}`,
                                                background: selection.include ? theme.colors.accent : 'transparent',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            {selection.include ? (
                                                <CheckCircleIcon {...getIconProps('status', { color: 'white' })} />
                                            ) : (
                                                <div style={{ width: 16, height: 16 }} />
                                            )}
                                        </button>

                                        {/* Product Info */}
                                        <div>
                                            <div style={{
                                                ...getDashboardTypographyStyle('cardTitle'),
                                                color: theme.colors.text,
                                                margin: 0
                                            }}>
                                                {product.productCode}
                                            </div>
                                            <div style={{
                                                ...getDashboardTypographyStyle('bodyText'),
                                                color: theme.colors.textSubtle,
                                                margin: '2px 0 0 0',
                                                fontSize: 12
                                            }}>
                                                {product.cleanDescription}
                                            </div>
                                        </div>

                                        {/* Install Time Input */}
                                        <input
                                            type="number"
                                            step="0.1"
                                            min="0"
                                            value={selection.installTimeHours}
                                            onChange={(e) => handleSelectionChange(product.productCode, 'installTimeHours', e.target.value)}
                                            disabled={!selection.include}
                                            {...getInputA11yProps({
                                                label: `Install time for ${product.productCode}`,
                                                required: selection.include
                                            })}
                                            style={{
                                                ...getDashboardInputStyle(),
                                                fontSize: 14,
                                                opacity: selection.include ? 1 : 0.5,
                                                cursor: selection.include ? 'text' : 'not-allowed'
                                            }}
                                        />

                                        {/* Heavy Item Toggle */}
                                        <button
                                            {...getButtonA11yProps({
                                                label: `Toggle heavy item for ${product.productCode}`,
                                                pressed: selection.isHeavy,
                                                disabled: !selection.include
                                            })}
                                            onClick={() => handleSelectionChange(product.productCode, 'isHeavy', !selection.isHeavy)}
                                            disabled={!selection.include}
                                            style={{
                                                padding: '6px 10px',
                                                border: `1px solid ${selection.isHeavy ? theme.colors.accent : theme.colors.border}`,
                                                borderRadius: 4,
                                                background: selection.isHeavy ? theme.colors.accent : 'transparent',
                                                color: selection.isHeavy ? 'white' : theme.colors.text,
                                                cursor: selection.include ? 'pointer' : 'not-allowed',
                                                fontSize: 11,
                                                opacity: selection.include ? 1 : 0.5
                                            }}
                                        >
                                            {selection.isHeavy ? 'Heavy' : 'Standard'}
                                        </button>

                                        {/* Quantity */}
                                        <div style={{
                                            ...getDashboardTypographyStyle('cardTitle'),
                                            textAlign: 'center',
                                            color: theme.colors.text
                                        }}>
                                            {totalQuantity}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Action Buttons */}
            <div style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                marginTop: isMobile ? 16 : 24,
                paddingTop: 16,
                borderTop: `1px solid ${theme.colors.border}`,
                gap: isMobile ? 16 : 0
            }}>
                <div
                    role="status"
                    aria-live="polite"
                    style={{
                        ...getDashboardTypographyStyle('bodyText'),
                        color: theme.colors.textSubtle,
                        fontSize: isMobile ? 13 : 14,
                        textAlign: isMobile ? 'center' : 'left'
                    }}
                >
                    {selectedCount > 0 ? (
                        `${selectedCount} item${selectedCount === 1 ? '' : 's'} selected for inclusion`
                    ) : (
                        'No accessories selected - will proceed with main products only'
                    )}
                </div>

                <div style={{ display: 'flex', gap: 12, flexDirection: isMobile ? 'column-reverse' : 'row' }}>
                    <button
                        {...getButtonA11yProps({
                            label: 'Skip all accessories and continue'
                        })}
                        onClick={onSkip}
                        style={{
                            ...getDashboardButtonStyle('secondary'),
                            ...getTouchFriendlyStyles(isTouchDevice),
                            fontSize: isMobile ? 16 : 14,
                            width: isMobile ? '100%' : 'auto'
                        }}
                    >
                        Skip All Accessories
                    </button>

                    <button
                        {...getButtonA11yProps({
                            label: 'Continue with selected accessories',
                            disabled: hasInvalidTimes
                        })}
                        onClick={handleSubmit}
                        disabled={hasInvalidTimes}
                        style={{
                            ...getDashboardButtonStyle('primary', {
                                backgroundColor: hasInvalidTimes ? theme.colors.textSubtle : theme.colors.accent
                            }),
                            ...getTouchFriendlyStyles(isTouchDevice),
                            fontSize: isMobile ? 16 : 14,
                            opacity: hasInvalidTimes ? 0.6 : 1,
                            cursor: hasInvalidTimes ? 'not-allowed' : 'pointer',
                            width: isMobile ? '100%' : 'auto'
                        }}
                    >
                        Continue with Selected Items
                    </button>
                </div>
            </div>
        </div>
    );
};