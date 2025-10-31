
import React, { useState, useEffect } from 'react';

import { getGlassmorphicStyle as _getGlassmorphicStyle } from '../../../components/ui/GlassmorphicStyles';
import { theme } from '../../../lib/theme';
import { AppConfig, ProductReference } from '../types';
import { getIconProps } from '../utils/iconSizing';

import { GearIcon, SaveIcon, ArrowUturnLeftIcon, TrashIcon, PencilIcon, PlusCircleIcon, CurrencyPoundIcon, ClockIcon, BookOpenIcon } from './icons';

interface AdminPanelProps {
    config: AppConfig;
    onSave: (newConfig: AppConfig) => void;
    onReset: () => void;
}

const Section: React.FC<{ title: string, description: string, children: React.ReactNode, accent?: boolean }> = ({ title, description, children, accent = false }) => (
    <div style={{
        background: accent ? `linear-gradient(135deg, ${theme.colors.accent}15, ${theme.colors.panel})` : theme.colors.panel,
        borderRadius: theme.radii.lg,
        boxShadow: accent ? `0 8px 32px ${theme.colors.accent}20` : theme.shadow,
        padding: 32,
        border: `1px solid ${accent ? theme.colors.accent + '40' : theme.colors.border}`,
        position: 'relative',
        overflow: 'hidden'
    }}>
        {accent && (
            <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: 100,
                height: 100,
                background: `linear-gradient(135deg, ${theme.colors.accent}20, transparent)`,
                borderRadius: '0 0 0 100px'
            }} />
        )}
        <div style={{ position: 'relative' }}>
            <h3 style={{ 
                fontSize: 22, 
                fontWeight: 700, 
                color: accent ? theme.colors.accent : theme.colors.text, 
                margin: 0,
                marginBottom: 8
            }}>{title}</h3>
            <p style={{ 
                fontSize: 15, 
                color: theme.colors.textSubtle, 
                margin: 0, 
                marginBottom: 28,
                lineHeight: 1.5
            }}>{description}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {children}
            </div>
        </div>
    </div>
);

const InputField: React.FC<{ 
    label: string, 
    name: string, 
    value: string | number, 
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, 
    type?: string, 
    step?: string, 
    min?: string, 
    description?: string,
    icon?: React.ReactNode
}> = ({ label, name, value, onChange, type = "number", step = "0.01", min = "0", description, icon }) => (
    <div style={{ position: 'relative' }}>
        <label htmlFor={name} style={{ 
            display: 'flex',
            fontSize: 15, 
            fontWeight: 600, 
            color: theme.colors.text, 
            marginBottom: 8,
            alignItems: 'center',
            gap: 8
        }}>
            {icon && <span style={{ color: theme.colors.accent }}>{icon}</span>}
            {label}
        </label>
        <input
            type={type}
            name={name}
            id={name}
            value={value}
            onChange={onChange}
            step={step}
            min={min}
            style={{
                display: "block",
                width: "100%",
                padding: "12px 16px",
                background: theme.colors.panelAlt,
                border: `2px solid ${theme.colors.border}`,
                borderRadius: theme.radii.md,
                color: theme.colors.text,
                fontSize: 15,
                fontWeight: 500,
                transition: 'all 0.2s ease',
                outline: 'none'
            }}
            onFocus={(e) => {
                e.currentTarget.style.borderColor = theme.colors.accent;
                e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.colors.accent}20`;
            }}
            onBlur={(e) => {
                e.currentTarget.style.borderColor = theme.colors.border;
                e.currentTarget.style.boxShadow = 'none';
            }}
        />
        {description && (
            <p style={{ 
                marginTop: 6, 
                fontSize: 13, 
                color: theme.colors.textSubtle, 
                margin: 0,
                fontStyle: 'italic'
            }}>{description}</p>
        )}
    </div>
);

const _ToggleButton: React.FC<{
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    description?: string;
}> = ({ label, checked, onChange, description }) => (
    <div>
        <button
            type="button"
            onClick={() => onChange(!checked)}
            style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                border: `2px solid ${checked ? theme.colors.accent : theme.colors.border}`,
                borderRadius: theme.radii.md,
                background: checked ? theme.colors.accent : theme.colors.panelAlt,
                color: checked ? "white" : theme.colors.text,
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 600,
                transition: "all 0.2s ease",
                width: "100%",
                justifyContent: "flex-start"
            }}
            onMouseOver={(e) => {
                if (!checked) {
                    e.currentTarget.style.borderColor = theme.colors.accent;
                    e.currentTarget.style.background = theme.colors.accent + '10';
                }
            }}
            onMouseOut={(e) => {
                if (!checked) {
                    e.currentTarget.style.borderColor = theme.colors.border;
                    e.currentTarget.style.background = theme.colors.panelAlt;
                }
            }}
        >
            <div style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background: checked ? "white" : "transparent",
                border: `2px solid ${checked ? "white" : theme.colors.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease"
            }}>
                {checked && (
                    <div style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: theme.colors.accent
                    }} />
                )}
            </div>
            {label}
        </button>
        {description && (
            <p style={{
                marginTop: 6,
                fontSize: 13,
                color: theme.colors.textSubtle,
                margin: 0,
                fontStyle: 'italic'
            }}>{description}</p>
        )}
    </div>
);

export const AdminPanel: React.FC<AdminPanelProps> = ({ config, onSave, onReset }) => {
    const [localConfig, setLocalConfig] = useState<AppConfig>(config);
    const [productSearch, setProductSearch] = useState('');
    const [_selectedProductCode, setSelectedProductCode] = useState<string>('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [showFullCatalogue, setShowFullCatalogue] = useState(false);
    const [editingProduct, setEditingProduct] = useState<string | null>(null);

    useEffect(() => {
        setLocalConfig(config);
    }, [config]);

    useEffect(() => {
        const handleClickOutside = (_event: MouseEvent) => {
            if (showDropdown) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showDropdown]);

    const handlePricingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalConfig(prev => ({
            ...prev,
            pricing: {
                ...prev.pricing,
                [name]: parseFloat(value) || 0
            }
        }));
    };

    const handleRulesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalConfig(prev => ({
            ...prev,
            rules: {
                ...prev.rules,
                [name]: parseFloat(value) || 0
            }
        }));
    };
    
    const handlePreparedByAdd = () => {
        const newName = prompt("Enter a new name for the 'Prepared By' list:");
        if (newName && newName.trim()) {
            setLocalConfig(prev => ({
                ...prev,
                rules: { 
                    ...prev.rules, 
                    preparedByOptions: [...prev.rules.preparedByOptions, newName.trim()] 
                }
            }));
        }
    };

    const handlePreparedByRemove = (index: number) => {
        setLocalConfig(prev => ({
            ...prev,
            rules: { 
                ...prev.rules, 
                preparedByOptions: prev.rules.preparedByOptions.filter((_, i) => i !== index)
            }
        }));
    };

    const handlePreparedByEdit = (index: number, newValue: string) => {
        setLocalConfig(prev => ({
            ...prev,
            rules: { 
                ...prev.rules, 
                preparedByOptions: prev.rules.preparedByOptions.map((name, i) => i === index ? newValue : name)
            }
        }));
    };
    
    const handleProductChange = (code: string, field: keyof ProductReference, value: unknown) => {
        setLocalConfig(prev => ({
            ...prev,
            productCatalogue: {
                ...prev.productCatalogue,
                [code]: {
                    ...prev.productCatalogue[code],
                    [field]: value
                }
            }
        }));
    };

    const handleAddProduct = () => {
        const newCode = prompt("Enter the new unique product code:");
        if (newCode && !localConfig.productCatalogue[newCode]) {
            const newProduct: ProductReference = {
                installTimeHours: 0.5,
                wasteVolumeM3: localConfig.rules.defaultWasteVolumeM3,
                isHeavy: false
            };
            setLocalConfig(prev => ({
                ...prev,
                productCatalogue: {
                    ...prev.productCatalogue,
                    [newCode]: newProduct
                }
            }));
        } else if (newCode) {
            alert("A product with this code already exists.");
        }
    };

    const handleRemoveProduct = (code: string) => {
        if (window.confirm(`Are you sure you want to delete product "${code}"?`)) {
            const newCatalogue = { ...localConfig.productCatalogue };
            delete newCatalogue[code];
            setLocalConfig(prev => ({
                ...prev,
                productCatalogue: newCatalogue
            }));
        }
    };


    const filteredProducts = Object.entries(localConfig.productCatalogue)
        .filter(([code]) => code.toLowerCase().includes(productSearch.toLowerCase()))
        .sort(([a], [b]) => a.localeCompare(b));

    const handleSelectProduct = (code: string) => {
        setSelectedProductCode(code);
        setProductSearch(code);
        setShowDropdown(false);
        setEditingProduct(code);
    };

    const handleSearchChange = (value: string) => {
        setProductSearch(value);
        setShowDropdown(value.length > 0);
        setSelectedProductCode('');
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: `1px solid ${theme.colors.border}`,
                paddingBottom: 16
            }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <GearIcon {...getIconProps('feature', { color: theme.colors.accent, marginRight: 16 })} />
                    <div>
                        <h1 style={{ fontSize: 30, fontWeight: 700, color: theme.colors.text, margin: 0 }}>Admin Panel</h1>
                        <p style={{ margin: 0, marginTop: 4, color: theme.colors.textSubtle }}>Customize application settings, pricing, and products.</p>
                    </div>
                </div>
                <div style={{ display: "flex", gap: 12 }}>
                    <button onClick={() => onSave(localConfig)} style={{
                        display: "inline-flex",
                        alignItems: "center",
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
                    onMouseOut={(e) => e.currentTarget.style.background = theme.colors.accent}>
                        <SaveIcon style={{ height: 20, width: 20, marginRight: 8 }} />
                        Save Changes
                    </button>
                    <button onClick={onReset} style={{
                        display: "inline-flex",
                        alignItems: "center",
                        padding: "8px 16px",
                        fontSize: 14,
                        fontWeight: 500,
                        color: theme.colors.text,
                        background: theme.colors.panelAlt,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radii.md,
                        cursor: "pointer"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = theme.colors.muted}
                    onMouseOut={(e) => e.currentTarget.style.background = theme.colors.panelAlt}>
                        <ArrowUturnLeftIcon style={{ height: 20, width: 20, marginRight: 8 }} />
                        Reset to Defaults
                    </button>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 32 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                    <Section title="Client Pricing & Costs" description="Set the day rates charged to clients for labour, vehicles, and services." accent={true}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <InputField 
                                label="1-Man Van Day Rate" 
                                name="oneManVanDayRate" 
                                value={localConfig.pricing.oneManVanDayRate} 
                                onChange={handlePricingChange}
                                icon={<CurrencyPoundIcon style={{ height: 16, width: 16 }} />}
                            />
                            <InputField 
                                label="2-Man Van Day Rate" 
                                name="twoManVanDayRate" 
                                value={localConfig.pricing.twoManVanDayRate} 
                                onChange={handlePricingChange}
                                icon={<CurrencyPoundIcon style={{ height: 16, width: 16 }} />}
                            />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <InputField 
                                label="Additional Fitter Day Rate" 
                                name="additionalFitterDayRate" 
                                value={localConfig.pricing.additionalFitterDayRate} 
                                onChange={handlePricingChange}
                                icon={<CurrencyPoundIcon style={{ height: 16, width: 16 }} />}
                            />
                            <InputField 
                                label="Supervisor Day Rate" 
                                name="supervisorDayRate" 
                                value={localConfig.pricing.supervisorDayRate} 
                                onChange={handlePricingChange}
                                icon={<CurrencyPoundIcon style={{ height: 16, width: 16 }} />}
                            />
                        </div>
                        <InputField 
                            label="Specialist Reworking Flat Rate" 
                            name="specialistReworkingFlatRate" 
                            value={localConfig.pricing.specialistReworkingFlatRate} 
                            onChange={handlePricingChange}
                            icon={<CurrencyPoundIcon style={{ height: 16, width: 16 }} />}
                        />
                    </Section>
                    <Section title="Calculation Rules" description="Adjust the core parameters used for labour and waste calculations.">
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <InputField 
                                label="Working Hours per Day" 
                                name="hoursPerDay" 
                                value={localConfig.rules.hoursPerDay} 
                                onChange={handleRulesChange} 
                                step="0.5"
                                icon={<ClockIcon style={{ height: 16, width: 16 }} />}
                            />
                            <InputField 
                                label="Van Waste Capacity (m³)" 
                                name="vanCapacityM3" 
                                value={localConfig.rules.vanCapacityM3} 
                                onChange={handleRulesChange} 
                                step="0.1"
                                description="Maximum waste volume per van load"
                            />
                        </div>
                        <InputField 
                            label="Default Waste Volume per Item (m³)" 
                            name="defaultWasteVolumeM3" 
                            value={localConfig.rules.defaultWasteVolumeM3} 
                            onChange={handleRulesChange} 
                            step="0.001"
                            description="Used when product waste volume is unknown"
                        />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <InputField 
                                label="Uplift via Stairs Buffer (%)" 
                                name="upliftStairsBufferPercent" 
                                value={localConfig.rules.upliftStairsBufferPercent} 
                                onChange={handleRulesChange} 
                                step="1" 
                                description="Extra time for stair access"
                            />
                            <InputField 
                                label="Extended Uplift Buffer (%)" 
                                name="extendedUpliftBufferPercent" 
                                value={localConfig.rules.extendedUpliftBufferPercent} 
                                onChange={handleRulesChange} 
                                step="1" 
                                description="Extra time for long vehicle distance"
                            />
                        </div>
                        <InputField 
                            label="Supervisor Threshold (Total Days)" 
                            name="supervisorThresholdDays" 
                            value={localConfig.rules.supervisorThresholdDays} 
                            onChange={handleRulesChange} 
                            step="0.5" 
                            description="Auto-add supervisor when job exceeds this duration"
                        />
                    </Section>
                    <Section title="'Prepared By' Options" description="Manage the list of names for the 'Prepared By' dropdown. Add, edit or remove names individually.">
                        {localConfig.rules.preparedByOptions.map((name, index) => (
                            <div key={index} style={{ display: "flex", gap: 12, alignItems: "end" }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ 
                                        display: "block", 
                                        fontSize: 14, 
                                        fontWeight: 500, 
                                        color: theme.colors.text, 
                                        marginBottom: 8 
                                    }}>Name {index + 1}</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => handlePreparedByEdit(index, e.target.value)}
                                        style={{
                                            display: "block",
                                            width: "100%",
                                            padding: "12px 16px",
                                            background: theme.colors.panelAlt,
                                            border: `2px solid ${theme.colors.border}`,
                                            borderRadius: theme.radii.md,
                                            color: theme.colors.text,
                                            fontSize: 15,
                                            fontWeight: 500,
                                            transition: 'all 0.2s ease',
                                            outline: 'none'
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = theme.colors.accent;
                                            e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.colors.accent}20`;
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = theme.colors.border;
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={() => handlePreparedByRemove(index)}
                                    style={{
                                        padding: "12px",
                                        background: "transparent",
                                        border: `2px solid ${theme.colors.border}`,
                                        borderRadius: theme.radii.md,
                                        color: theme.colors.textSubtle,
                                        cursor: "pointer",
                                        transition: "all 0.2s ease",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = `${theme.colors.danger}20`;
                                        e.currentTarget.style.color = theme.colors.danger;
                                        e.currentTarget.style.borderColor = theme.colors.danger;
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = theme.colors.textSubtle;
                                        e.currentTarget.style.borderColor = theme.colors.border;
                                    }}
                                >
                                    <TrashIcon style={{ height: 18, width: 18 }} />
                                </button>
                            </div>
                        ))}
                        <button
                            onClick={handlePreparedByAdd}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 8,
                                padding: "12px 16px",
                                background: theme.colors.accentAlt,
                                border: "none",
                                borderRadius: theme.radii.md,
                                color: "white",
                                cursor: "pointer",
                                fontSize: 15,
                                fontWeight: 600,
                                transition: "all 0.2s ease",
                                width: "100%"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = "#16a34a"}
                            onMouseOut={(e) => e.currentTarget.style.background = theme.colors.accentAlt}
                        >
                            <PlusCircleIcon style={{ height: 20, width: 20 }} />
                            Add New Name
                        </button>
                    </Section>
                </div>

                 <Section title="Product Catalogue" description="Search and edit individual products, or manage the entire catalogue.">
                    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                        <div style={{ position: "relative", flex: 1 }}>
                            <input
                                type="text"
                                placeholder="Search by product code..."
                                value={productSearch}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "12px 16px",
                                    background: theme.colors.panelAlt,
                                    border: `2px solid ${theme.colors.border}`,
                                    borderRadius: theme.radii.md,
                                    color: theme.colors.text,
                                    fontSize: 15,
                                    fontWeight: 500,
                                    outline: 'none',
                                    transition: 'all 0.2s ease'
                                }}
                                onFocus={(e) => {
                                    setShowDropdown(productSearch.length > 0);
                                    e.currentTarget.style.borderColor = theme.colors.accent;
                                    e.currentTarget.style.boxShadow = `0 0 0 3px ${theme.colors.accent}20`;
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = theme.colors.border;
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                            {showDropdown && filteredProducts.length > 0 && (
                                <div style={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    background: theme.colors.panel,
                                    border: `1px solid ${theme.colors.border}`,
                                    borderRadius: theme.radii.md,
                                    maxHeight: 200,
                                    overflowY: "auto",
                                    zIndex: 10,
                                    marginTop: 4,
                                    boxShadow: theme.shadow
                                }}>
                                    {filteredProducts.map(([code, product]) => (
                                        <div
                                            key={code}
                                            onClick={() => handleSelectProduct(code)}
                                            style={{
                                                padding: "8px 12px",
                                                cursor: "pointer",
                                                borderBottom: `1px solid ${theme.colors.border}`,
                                                transition: "background 0.2s ease"
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = theme.colors.panelAlt}
                                            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
                                        >
                                            <div style={{ fontWeight: 500, color: theme.colors.text }}>{code}</div>
                                            <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
                                                {product.installTimeHours.toFixed(2)}h • {product.wasteVolumeM3}m³ • {product.isHeavy ? 'Heavy' : 'Light'}
                                            </div>
                                        </div>
                                    ))}
                                    {filteredProducts.length > 50 && (
                                        <div style={{
                                            padding: "8px 12px",
                                            fontSize: 12,
                                            color: theme.colors.textSubtle,
                                            textAlign: "center",
                                            fontStyle: 'italic'
                                        }}>
                                            Type to narrow down {filteredProducts.length} results...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            <button onClick={handleAddProduct} style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "12px 20px",
                                fontSize: 15,
                                fontWeight: 600,
                                color: "white",
                                background: theme.colors.accentAlt,
                                borderRadius: theme.radii.md,
                                border: "none",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                transition: "all 0.2s ease"
                            }}
                            onMouseOver={(e) => e.currentTarget.style.background = "#16a34a"}
                            onMouseOut={(e) => e.currentTarget.style.background = theme.colors.accentAlt}>
                                 <PlusCircleIcon style={{ height: 20, width: 20, marginRight: 8 }} />
                                Add Product
                            </button>
                            <button onClick={() => setShowFullCatalogue(!showFullCatalogue)} style={{
                                display: "inline-flex",
                                alignItems: "center",
                                padding: "8px 16px",
                                fontSize: 13,
                                fontWeight: 500,
                                color: theme.colors.text,
                                background: theme.colors.panelAlt,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.radii.md,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                transition: "all 0.2s ease"
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.background = theme.colors.muted;
                                e.currentTarget.style.borderColor = theme.colors.accent;
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.background = theme.colors.panelAlt;
                                e.currentTarget.style.borderColor = theme.colors.border;
                            }}>
                                <BookOpenIcon style={{ height: 16, width: 16, marginRight: 6 }} />
                                {showFullCatalogue ? 'Hide' : 'Show'} Catalogue
                            </button>
                        </div>
                    </div>

                    {editingProduct && localConfig.productCatalogue[editingProduct] && (
                        <div style={{
                            background: theme.colors.panelAlt,
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: theme.radii.lg,
                            padding: 24,
                            marginBottom: 16
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                <h4 style={{ fontSize: 16, fontWeight: 600, color: theme.colors.text, margin: 0 }}>Editing: {editingProduct}</h4>
                                <button 
                                    onClick={() => setEditingProduct(null)}
                                    style={{
                                        padding: "4px 8px",
                                        background: "transparent",
                                        border: "none",
                                        color: theme.colors.textSubtle,
                                        cursor: "pointer"
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.color = theme.colors.text}
                                    onMouseOut={(e) => e.currentTarget.style.color = theme.colors.textSubtle}
                                >
                                    ✕
                                </button>
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto", gap: 16, alignItems: "end" }}>
                                <div>
                                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: theme.colors.text, marginBottom: 4 }}>Install Time (hours)</label>
                                    <input 
                                        type="number" 
                                        step="0.01" 
                                        min="0" 
                                        value={localConfig.productCatalogue[editingProduct].installTimeHours} 
                                        onChange={(e) => handleProductChange(editingProduct, 'installTimeHours', parseFloat(e.target.value) || 0)} 
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
                                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: theme.colors.text, marginBottom: 4 }}>Waste Volume (m³)</label>
                                    <input 
                                        type="number" 
                                        step="0.001" 
                                        min="0" 
                                        value={localConfig.productCatalogue[editingProduct].wasteVolumeM3} 
                                        onChange={(e) => handleProductChange(editingProduct, 'wasteVolumeM3', parseFloat(e.target.value) || 0)} 
                                        style={
                                            {
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
                                    <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: theme.colors.text, marginBottom: 4 }}>Heavy Item</label>
                                    <button
                                        type="button"
                                        onClick={() => handleProductChange(editingProduct, 'isHeavy', !localConfig.productCatalogue[editingProduct].isHeavy)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            padding: "8px 12px",
                                            border: `1px solid ${localConfig.productCatalogue[editingProduct].isHeavy ? theme.colors.accent : theme.colors.border}`,
                                            borderRadius: theme.radii.md,
                                            background: localConfig.productCatalogue[editingProduct].isHeavy ? theme.colors.accent : theme.colors.panel,
                                            color: localConfig.productCatalogue[editingProduct].isHeavy ? "white" : theme.colors.text,
                                            cursor: "pointer",
                                            fontSize: 14,
                                            fontWeight: 500,
                                            transition: "all 0.2s ease",
                                            whiteSpace: "nowrap"
                                        }}
                                    >
                                        <div style={{
                                            width: 16,
                                            height: 16,
                                            borderRadius: "50%",
                                            background: localConfig.productCatalogue[editingProduct].isHeavy ? "white" : "transparent",
                                            border: `2px solid ${localConfig.productCatalogue[editingProduct].isHeavy ? "white" : theme.colors.border}`,
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center"
                                        }}>
                                            {localConfig.productCatalogue[editingProduct].isHeavy && <div style={{ width: 6, height: 6, borderRadius: "50%", background: theme.colors.accent }} />}
                                        </div>
                                        Heavy
                                    </button>
                                </div>
                                <button 
                                    onClick={() => handleRemoveProduct(editingProduct)}
                                    style={{
                                        padding: "8px",
                                        background: "transparent",
                                        border: `1px solid ${theme.colors.border}`,
                                        borderRadius: theme.radii.md,
                                        color: theme.colors.textSubtle,
                                        cursor: "pointer",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = `${theme.colors.danger}20`;
                                        e.currentTarget.style.color = theme.colors.danger;
                                        e.currentTarget.style.borderColor = theme.colors.danger;
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = theme.colors.textSubtle;
                                        e.currentTarget.style.borderColor = theme.colors.border;
                                    }}
                                >
                                    <TrashIcon style={{ height: 20, width: 20 }}/>
                                </button>
                            </div>
                        </div>
                    )}

                    {showFullCatalogue && (
                        <div style={{
                            background: theme.colors.panelAlt,
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: theme.radii.lg,
                            padding: 24,
                            marginBottom: 16
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                                <h4 style={{ fontSize: 18, fontWeight: 700, color: theme.colors.text, margin: 0 }}>Full Product Catalogue</h4>
                                <div style={{ fontSize: 14, color: theme.colors.textSubtle }}>
                                    {Object.keys(localConfig.productCatalogue).length} products total
                                </div>
                            </div>
                            <div style={{
                                maxHeight: 400,
                                overflowY: "auto",
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.radii.md
                            }}>
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
                                    gap: 16,
                                    padding: "12px 16px",
                                    background: theme.colors.panel,
                                    borderBottom: `1px solid ${theme.colors.border}`,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: theme.colors.textSubtle,
                                    position: "sticky",
                                    top: 0,
                                    zIndex: 1
                                }}>
                                    <div>Product Code</div>
                                    <div>Install Time</div>
                                    <div>Waste Volume</div>
                                    <div>Heavy Item</div>
                                    <div>Actions</div>
                                </div>
                                {Object.entries(localConfig.productCatalogue)
                                    .sort(([a], [b]) => a.localeCompare(b))
                                    .map(([code, product]) => (
                                    <div key={code} style={{
                                        display: "grid",
                                        gridTemplateColumns: "2fr 1fr 1fr 1fr auto",
                                        gap: 16,
                                        padding: "12px 16px",
                                        borderBottom: `1px solid ${theme.colors.border}`,
                                        fontSize: 14,
                                        alignItems: "center",
                                        transition: "background 0.2s ease"
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = theme.colors.panel}
                                    onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                                        <div style={{ fontWeight: 600, color: theme.colors.text, fontFamily: "monospace" }}>{code}</div>
                                        <div style={{ color: theme.colors.text }}>{product.installTimeHours.toFixed(2)}h</div>
                                        <div style={{ color: theme.colors.text }}>{product.wasteVolumeM3}m³</div>
                                        <div style={{ color: product.isHeavy ? theme.colors.danger : theme.colors.accentAlt, fontWeight: 500 }}>
                                            {product.isHeavy ? 'Heavy' : 'Light'}
                                        </div>
                                        <div style={{ display: "flex", gap: 8 }}>
                                            <button
                                                onClick={() => {
                                                    setEditingProduct(code);
                                                    setProductSearch(code);
                                                    setShowFullCatalogue(false);
                                                }}
                                                style={{
                                                    padding: "6px",
                                                    background: "transparent",
                                                    border: `1px solid ${theme.colors.border}`,
                                                    borderRadius: theme.radii.sm,
                                                    color: theme.colors.textSubtle,
                                                    cursor: "pointer",
                                                    transition: "all 0.2s ease"
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.background = theme.colors.accent + '20';
                                                    e.currentTarget.style.color = theme.colors.accent;
                                                    e.currentTarget.style.borderColor = theme.colors.accent;
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.background = "transparent";
                                                    e.currentTarget.style.color = theme.colors.textSubtle;
                                                    e.currentTarget.style.borderColor = theme.colors.border;
                                                }}
                                            >
                                                <PencilIcon style={{ height: 14, width: 14 }} />
                                            </button>
                                            <button
                                                onClick={() => handleRemoveProduct(code)}
                                                style={{
                                                    padding: "6px",
                                                    background: "transparent",
                                                    border: `1px solid ${theme.colors.border}`,
                                                    borderRadius: theme.radii.sm,
                                                    color: theme.colors.textSubtle,
                                                    cursor: "pointer",
                                                    transition: "all 0.2s ease"
                                                }}
                                                onMouseOver={(e) => {
                                                    e.currentTarget.style.background = theme.colors.danger + '20';
                                                    e.currentTarget.style.color = theme.colors.danger;
                                                    e.currentTarget.style.borderColor = theme.colors.danger;
                                                }}
                                                onMouseOut={(e) => {
                                                    e.currentTarget.style.background = "transparent";
                                                    e.currentTarget.style.color = theme.colors.textSubtle;
                                                    e.currentTarget.style.borderColor = theme.colors.border;
                                                }}
                                            >
                                                <TrashIcon style={{ height: 14, width: 14 }} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div style={{ 
                        fontSize: 14, 
                        color: theme.colors.textSubtle,
                        textAlign: "center",
                        padding: "16px",
                        background: theme.colors.panelAlt,
                        borderRadius: theme.radii.md,
                        border: `1px solid ${theme.colors.border}`
                    }}>
                        {Object.keys(localConfig.productCatalogue).length} products in catalogue • 
                        {editingProduct ? 'Currently editing a product' : 'Search above to edit a product'}
                    </div>
                </Section>
            </div>
        </div>
    );
};
