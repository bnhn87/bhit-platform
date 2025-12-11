
import React, { useState, useMemo } from 'react';

import { theme } from '../../../lib/theme';
import { ParsedProduct, ProductReference, AppConfig } from '../types';
import { getDashboardCardStyle, getDashboardButtonStyle, getDashboardTypographyStyle, getDashboardInputStyle, spacing as _spacing } from '../utils/dashboardStyles';
import { getIconProps } from '../utils/iconSizing';

import { HelpCircleIcon } from './icons';
import ProductAliasAttacher from './ProductAliasAttacher';


interface UnknownProductInputProps {
    products: ParsedProduct[];
    onSubmit: (data: Record<string, ProductReference>) => void;
    config: AppConfig;
}

type FormData = Record<string, {
    installTimeHours: string;
    isHeavy: boolean;
}>

// This normalization MUST match the one in `findBestMatchKey` in calculationService.ts
const normalizeCode = (code: string) => code.toUpperCase().replace(/[\s()-_]/g, '');

export const UnknownProductInput: React.FC<UnknownProductInputProps> = ({ products, onSubmit, config }) => {
    const initialFormData = useMemo(() => products.reduce((acc, p) => {
        const key = normalizeCode(p.productCode);
        if (!acc[key]) {
             acc[key] = { installTimeHours: '', isHeavy: false };
        }
        return acc;
    }, {} as FormData), [products]);

    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [resolvedProducts, setResolvedProducts] = useState<Record<string, ProductReference>>({});
    
    const handleChange = (productCode: string, field: string, value: string | boolean) => {
        const key = normalizeCode(productCode);
        setFormData(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                [field]: value,
            }
        }));
    };

    const handleProductResolved = (productCode: string, installTimeHours: number, wasteVolumeM3: number) => {
        const key = normalizeCode(productCode);
        setResolvedProducts(prev => ({
            ...prev,
            [key]: {
                installTimeHours,
                wasteVolumeM3,
                isHeavy: formData[key]?.isHeavy || false
            }
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        const submittedData: Record<string, ProductReference> = { ...resolvedProducts };
        let allValid = true;

        // Iterate over unique products to validate and build submission data
        for (const product of uniqueProducts) {
            const key = normalizeCode(product.productCode);

            // Skip if already resolved via alias attacher
            if (resolvedProducts[key]) {
                continue;
            }

            const data = formData[key];
            const installTime = parseFloat(data.installTimeHours);

            if (isNaN(installTime) || installTime < 0) {
                allValid = false;
                alert(`Please enter a valid installation time for product code: ${product.productCode}`);
                break;
            }

            submittedData[key] = {
                installTimeHours: installTime,
                wasteVolumeM3: config.rules.defaultWasteVolumeM3,
                isHeavy: data.isHeavy,
            };
        }

        if (allValid) {
            onSubmit(submittedData);
        }
    };

    // Create a list of unique products to render in the form to avoid duplicate fields
    const uniqueProducts = useMemo(() => {
        const seen = new Set<string>();
        return products.filter(p => {
            const key = normalizeCode(p.productCode);
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }, [products]);

    return (
        <div style={{
            ...getDashboardCardStyle('standard'),
            border: `1px solid ${theme.colors.warn}`,
            maxWidth: '800px',
            margin: '0 auto'
        }}>
            <div style={{ display: "flex", alignItems: "flex-start" }}>
                <HelpCircleIcon {...getIconProps('warning', { color: theme.colors.warn, marginRight: 16 })} />
                <div>
                    <h2 style={{
                        ...getDashboardTypographyStyle('sectionHeader'),
                        color: theme.colors.text,
                        margin: 0
                    }}>Missing Product Times</h2>
                    <p style={{
                        ...getDashboardTypographyStyle('bodyText'),
                        color: theme.colors.textSubtle,
                        margin: '4px 0 0 0'
                    }}>These products weren&apos;t found in your catalogue. Please provide installation times to continue. They&apos;ll be saved automatically for future quotes.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 24 }}>
                {uniqueProducts.map(product => {
                    const key = normalizeCode(product.productCode);
                    const productInstances = products.filter(p => normalizeCode(p.productCode) === key);
                    const totalQuantity = productInstances.reduce((sum, p) => sum + p.quantity, 0);

                    // Check if product is already resolved
                    if (resolvedProducts[key]) {
                        return (
                            <div key={key} style={{
                                ...getDashboardCardStyle('standard'),
                                background: theme.colors.muted,
                                opacity: 0.7
                            }}>
                                <p style={{
                                    ...getDashboardTypographyStyle('cardTitle'),
                                    color: theme.colors.text,
                                    margin: 0
                                }}>
                                    ✅ Product Code: <span style={{ fontWeight: 700, color: theme.colors.accent }}>{product.productCode}</span>
                                </p>
                                <p style={{
                                    ...getDashboardTypographyStyle('bodyText'),
                                    color: theme.colors.textSubtle,
                                    margin: '4px 0'
                                }}>
                                    {product.description} (Qty: {totalQuantity}) - {resolvedProducts[key].installTimeHours}h per unit
                                </p>
                            </div>
                        );
                    }

                    return (
                        <div key={key} style={{
                            ...getDashboardCardStyle('standard'),
                            background: theme.colors.panelAlt
                        }}>
                            <p style={{
                                ...getDashboardTypographyStyle('cardTitle'),
                                color: theme.colors.text,
                                margin: 0
                            }}>
                                Product Code: <span style={{ fontWeight: 700, color: theme.colors.accent }}>{product.productCode}</span>
                            </p>
                            <p style={{
                                ...getDashboardTypographyStyle('bodyText'),
                                color: theme.colors.textSubtle,
                                margin: '4px 0 16px 0'
                            }}>{product.description} (Total Qty: {totalQuantity})</p>

                            <ProductAliasAttacher
                                productCode={product.productCode}
                                productDescription={product.description}
                                defaultTime={parseFloat(formData[key]?.installTimeHours) || 0}
                                defaultWaste={config.rules.defaultWasteVolumeM3}
                                onAttached={(productId, canonicalName) => {
                                    // When attached to existing product, we don't get times back
                                    // We need to fetch them from catalogue
                                    if (process.env.NODE_ENV === 'development') {
                                    }
                                }}
                                onSaveNew={(installTimeHours, wasteVolumeM3) => {
                                    handleProductResolved(product.productCode, installTimeHours, wasteVolumeM3);
                                }}
                            />

                            <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${theme.colors.border}` }}>
                                <label style={{
                                    ...getDashboardTypographyStyle('labelText'),
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 8,
                                    cursor: "pointer"
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={formData[key]?.isHeavy || false}
                                        onChange={(e) => handleChange(product.productCode, 'isHeavy', e.target.checked)}
                                        style={{ width: 18, height: 18 }}
                                    />
                                    Heavy / 2-person lift required
                                </label>
                            </div>
                        </div>
                    )
                })}
                <button type="submit" style={{
                    ...getDashboardButtonStyle('primary', {
                        backgroundColor: theme.colors.accentAlt,
                        color: 'white'
                    }),
                    width: "100%",
                    fontSize: '16px',
                    transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#16a34a";
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 0 14px 3px rgba(22, 163, 74, 0.35)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.accentAlt;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}>
                    <span style={getDashboardTypographyStyle('buttonText')}>Continue & Save to Catalogue</span>
                </button>
            </form>
        </div>
    );
};
