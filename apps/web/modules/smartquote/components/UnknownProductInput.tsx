
import React, { useState, useMemo } from 'react';

import { theme } from '../../../lib/theme';
import { ParsedProduct, ProductReference, AppConfig } from '../types';
import { getDashboardCardStyle, getDashboardButtonStyle, getDashboardTypographyStyle, getDashboardInputStyle, spacing as _spacing } from '../utils/dashboardStyles';
import { getIconProps } from '../utils/iconSizing';

import { HelpCircleIcon } from './icons';

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

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const submittedData: Record<string, ProductReference> = {};
        let allValid = true;

        // Iterate over unique products to validate and build submission data
        for (const product of uniqueProducts) {
            const key = normalizeCode(product.productCode);
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
                            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "end" }}>
                                <div>
                                    <label htmlFor={`time-${key}`} style={{
                                        ...getDashboardTypographyStyle('labelText'),
                                        display: "block",
                                        color: theme.colors.text,
                                        marginBottom: 4
                                    }}>Install Time (hours)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        id={`time-${key}`}
                                        value={formData[key]?.installTimeHours || ''}
                                        onChange={(e) => handleChange(product.productCode, 'installTimeHours', e.target.value)}
                                        placeholder="e.g., 1.65"
                                        required
                                        min="0"
                                        style={{
                                            ...getDashboardInputStyle(),
                                            display: "block",
                                            width: "100%",
                                            fontSize: 16,
                                            fontWeight: 500
                                        }}
                                    />
                                </div>
                                <div>
                                    <label style={{
                                        ...getDashboardTypographyStyle('labelText'),
                                        display: "block",
                                        color: theme.colors.text,
                                        marginBottom: 4
                                    }}>Item Type</label>
                                    <button
                                        type="button"
                                        onClick={() => handleChange(product.productCode, 'isHeavy', !formData[key]?.isHeavy)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            padding: "12px 16px",
                                            border: `1px solid ${formData[key]?.isHeavy ? theme.colors.accent : theme.colors.border}`,
                                            borderRadius: theme.radii.md,
                                            background: formData[key]?.isHeavy ? theme.colors.accent : theme.colors.panelAlt,
                                            color: formData[key]?.isHeavy ? "white" : theme.colors.text,
                                            cursor: "pointer",
                                            fontSize: 14,
                                            fontWeight: 500,
                                            transition: "all 0.2s ease",
                                            whiteSpace: "nowrap"
                                        }}
                                        onMouseOver={(e) => {
                                            if (!formData[key]?.isHeavy) {
                                                e.currentTarget.style.background = theme.colors.muted;
                                                e.currentTarget.style.borderColor = theme.colors.accent;
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!formData[key]?.isHeavy) {
                                                e.currentTarget.style.background = theme.colors.panelAlt;
                                                e.currentTarget.style.borderColor = theme.colors.border;
                                            }
                                        }}
                                    >
                                        <div style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: "50%",
                                            background: formData[key]?.isHeavy ? "white" : "transparent",
                                            border: `2px solid ${formData[key]?.isHeavy ? "white" : theme.colors.border}`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}>
                                            {formData[key]?.isHeavy && <div style={{ width: 6, height: 6, borderRadius: "50%", background: theme.colors.accent }} />}
                                        </div>
                                        Heavy / 2-person
                                    </button>
                                 </div>
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
