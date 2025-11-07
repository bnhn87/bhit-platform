import React, { useState, useEffect } from 'react';

import { TaskBannerSettingsComponent } from '../components/admin/TaskBannerSettings';
import { useRequireAuth } from '../hooks/useRequireAuth';
import { useUserRole } from '../hooks/useUserRole';
import { theme } from '../lib/theme';
import { loadConfig, saveConfig } from '../modules/smartquote/services/configService';
import { AppConfig } from '../modules/smartquote/types';

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

const ToggleButton: React.FC<{
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

export default function AdminPanelPage() {
    useRequireAuth();
    const { role } = useUserRole();
    const [config, setConfig] = useState<AppConfig | null>(null);
    const [localConfig, setLocalConfig] = useState<AppConfig | null>(null);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);

    useEffect(() => {
        const loadedConfig = loadConfig();
        setConfig(loadedConfig);
        setLocalConfig(loadedConfig);
    }, []);

    const handleLaborCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!localConfig) return;
        
        const { name, value } = e.target;
        if (name === 'useHourlyRate') {
            setLocalConfig(prev => ({
                ...prev!,
                laborCosts: {
                    ...prev!.laborCosts,
                    useHourlyRate: (e.target as HTMLInputElement).checked
                }
            }));
        } else {
            setLocalConfig(prev => ({
                ...prev!,
                laborCosts: {
                    ...prev!.laborCosts,
                    [name]: parseFloat(value) || 0
                }
            }));
        }
    };

    const handleSave = () => {
        if (!localConfig) return;
        
        saveConfig(localConfig);
        setConfig(localConfig);
        setSaveMessage("Configuration saved successfully!");
        setTimeout(() => setSaveMessage(null), 3000);
    };

    const handleReset = () => {
        if (!config) return;
        
        setLocalConfig(config);
        setSaveMessage("Changes reset.");
        setTimeout(() => setSaveMessage(null), 3000);
    };

    const roleLower = role?.toLowerCase() || '';
    const hasAccess = roleLower === "director" || roleLower === "admin";

    if (!hasAccess) {
        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                <h1 style={{ color: theme.colors.text }}>Access Denied</h1>
                <p style={{ color: theme.colors.textSubtle }}>This area is restricted to Directors and Admins only.</p>
                <p style={{ color: theme.colors.textSubtle, marginTop: 8, fontSize: 12 }}>
                    Your current role: {role || 'none'} (detected as: {roleLower || 'none'})
                </p>
            </div>
        );
    }

    if (!localConfig) {
        return (
            <div style={{ padding: '24px', textAlign: 'center' }}>
                <p style={{ color: theme.colors.text }}>Loading...</p>
            </div>
        );
    }

    return (
        <div style={{ 
            padding: '32px',
            background: theme.colors.bg,
            minHeight: '100vh'
        }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', display: "flex", flexDirection: "column", gap: 32 }}>
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: `1px solid ${theme.colors.border}`,
                    paddingBottom: 16
                }}>
                    <div>
                        <h1 style={{ fontSize: 36, fontWeight: 800, color: theme.colors.text, margin: 0 }}>Admin Panel</h1>
                        <p style={{ margin: 0, marginTop: 8, color: theme.colors.textSubtle, fontSize: 16 }}>Director-only system configuration and P&L settings.</p>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                        <button onClick={handleSave} style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "12px 20px",
                            fontSize: 16,
                            fontWeight: 600,
                            color: "white",
                            background: theme.colors.accent,
                            borderRadius: theme.radii.md,
                            border: "none",
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = "#2563eb"}
                        onMouseOut={(e) => e.currentTarget.style.background = theme.colors.accent}>
                            💾 Save Changes
                        </button>
                        <button onClick={handleReset} style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "12px 20px",
                            fontSize: 16,
                            fontWeight: 600,
                            color: theme.colors.text,
                            background: theme.colors.panelAlt,
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: theme.radii.md,
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                        }}
                        onMouseOver={(e) => e.currentTarget.style.background = theme.colors.muted}
                        onMouseOut={(e) => e.currentTarget.style.background = theme.colors.panelAlt}>
                            🔄 Reset
                        </button>
                    </div>
                </div>

                {saveMessage && (
                    <div style={{
                        padding: "12px 16px",
                        background: theme.colors.accentAlt + '20',
                        border: `1px solid ${theme.colors.accentAlt}`,
                        borderRadius: theme.radii.md,
                        color: theme.colors.accentAlt,
                        fontWeight: 600,
                        textAlign: "center"
                    }}>
                        {saveMessage}
                    </div>
                )}

                <Section title="Labor Costs (P&L Metrics)" description="Configure internal labor costs for profit & loss calculations across all quoting systems." accent={true}>
                    <ToggleButton
                        label={localConfig.laborCosts.useHourlyRate ? "Hourly Rate Model" : "Day Rate Model"}
                        checked={localConfig.laborCosts.useHourlyRate}
                        onChange={(checked) => handleLaborCostChange({ target: { name: 'useHourlyRate', checked } } as React.ChangeEvent<HTMLInputElement>)}
                        description="Choose between day rate or hourly rate for internal cost calculations"
                    />
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                        <InputField 
                            label="1-Man Van Cost to Company" 
                            name="oneManVanCostToCompany" 
                            value={localConfig.laborCosts.oneManVanCostToCompany} 
                            onChange={handleLaborCostChange}
                            icon={<span style={{ fontSize: 16 }}>💷</span>}
                            description="Internal cost per day/hour"
                        />
                        <InputField 
                            label="2-Man Van Cost to Company" 
                            name="twoManVanCostToCompany" 
                            value={localConfig.laborCosts.twoManVanCostToCompany} 
                            onChange={handleLaborCostChange}
                            icon={<span style={{ fontSize: 16 }}>💷</span>}
                            description="Internal cost per day/hour"
                        />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                        <InputField 
                            label="Additional Fitter Cost to Company" 
                            name="additionalFitterCostToCompany" 
                            value={localConfig.laborCosts.additionalFitterCostToCompany} 
                            onChange={handleLaborCostChange}
                            icon={<span style={{ fontSize: 16 }}>💷</span>}
                            description="Internal cost per day/hour"
                        />
                        <InputField 
                            label="Supervisor Cost to Company" 
                            name="supervisorCostToCompany" 
                            value={localConfig.laborCosts.supervisorCostToCompany} 
                            onChange={handleLaborCostChange}
                            icon={<span style={{ fontSize: 16 }}>💷</span>}
                            description="Internal cost per day/hour"
                        />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
                        <InputField 
                            label="Specialist Reworking Cost to Company" 
                            name="specialistReworkingCostToCompany" 
                            value={localConfig.laborCosts.specialistReworkingCostToCompany} 
                            onChange={handleLaborCostChange}
                            icon={<span style={{ fontSize: 16 }}>💷</span>}
                            description="Internal cost per project"
                        />
                        <InputField 
                            label="Hourly Rate Multiplier" 
                            name="hourlyRateMultiplier" 
                            value={localConfig.laborCosts.hourlyRateMultiplier} 
                            onChange={handleLaborCostChange}
                            icon={<span style={{ fontSize: 16 }}>⏰</span>}
                            description="Convert day rates to hourly (e.g., 0.125 for 8h days)"
                            step="0.001"
                        />
                    </div>
                </Section>

                <Section title="Task Banner Settings" description="Control the scrolling LED highway at the top of your screen. Set global defaults for all users." accent={false}>
                    <TaskBannerSettingsComponent isDirector={hasAccess} />
                </Section>

                <div style={{
                    marginTop: 40,
                    padding: "20px",
                    background: theme.colors.panelAlt,
                    borderRadius: theme.radii.md,
                    border: `1px solid ${theme.colors.border}`,
                    textAlign: "center"
                }}>
                    <p style={{
                        margin: 0,
                        color: theme.colors.textSubtle,
                        fontSize: 14,
                        fontStyle: 'italic'
                    }}>
                        💡 These labor cost settings are shared across SmartQuote and other business systems for accurate P&L calculations.
                    </p>
                </div>
            </div>
        </div>
    );
}
