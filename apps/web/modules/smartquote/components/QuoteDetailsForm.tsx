
import React from 'react';

import { getGlassmorphicStyle } from '../../../components/ui/GlassmorphicStyles';
import { theme } from '../../../lib/theme';
import { useFormValidation, required } from '../hooks/useFormValidation';
import { QuoteDetails, AppConfig } from '../types';

import { TruckIcon, TrashIcon, BuildingIcon, ArrowTrendingUpIcon, WrenchIcon, UserGroupIcon } from './icons';

interface QuoteDetailsFormProps {
    details: QuoteDetails;
    onDetailsChange: (details: QuoteDetails) => void;
    config: AppConfig;
    onSubmit?: () => void;
    submitButtonText?: string;
}

export const QuoteDetailsForm: React.FC<QuoteDetailsFormProps> = ({ details, onDetailsChange, config, onSubmit, submitButtonText }) => {

    // Form validation
    const { getFieldError, validateFieldOnBlur, validateForm } = useFormValidation<QuoteDetails>({
        client: [required('Client name is required')],
        project: [required('Project name is required')],
        deliveryAddress: [required('Delivery address is required')]
    });

    const handleDetailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        let processedValue: string | boolean | number | null;

        if (type === 'checkbox') {
            processedValue = (e.target as HTMLInputElement).checked;
        } else if (name === 'overrideWasteVolumeM3') {
            const numValue = parseFloat(value);
            processedValue = value === '' ? null : (isNaN(numValue) ? (details.overrideWasteVolumeM3 || null) : numValue);
        } else if (name === 'customExtendedUpliftDays') {
            const numValue = parseInt(value, 10);
            processedValue = value === '' ? null : (isNaN(numValue) || numValue < 0 ? (details.customExtendedUpliftDays || null) : numValue);
        } else if (name === 'customExtendedUpliftFitters') {
            const numValue = parseInt(value, 10);
            processedValue = value === '' ? null : (isNaN(numValue) || numValue < 0 ? (details.customExtendedUpliftFitters || null) : numValue);
        } else if (name === 'outOfHoursDays') {
            const numValue = parseFloat(value);
            processedValue = value === '' ? null : (isNaN(numValue) || numValue < 0 ? (details.outOfHoursDays || null) : numValue);
        }
        else {
            processedValue = value;
        }

        onDetailsChange({
            ...details,
            [name]: processedValue
        });
    };

    const handleVehicleQuantityChange = (vehicleId: string, quantity: number) => {
        const currentVehicles = details.selectedVehicles || {};
        const updatedVehicles = { ...currentVehicles };
        
        if (quantity <= 0) {
            delete updatedVehicles[vehicleId];
        } else {
            updatedVehicles[vehicleId] = quantity;
        }
        
        onDetailsChange({
            ...details,
            selectedVehicles: Object.keys(updatedVehicles).length > 0 ? updatedVehicles : undefined
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (onSubmit) {
            const isValid = await validateForm(details);
            if (isValid) {
                onSubmit();
            } else {
                // Validation failed - errors will be displayed inline
                return;
            }
        }
    };

    const ErrorMessage: React.FC<{ message: string | null }> = ({ message }) => {
        if (!message) return null;
        return (
            <div style={{
                fontSize: 12,
                color: theme.colors.danger,
                marginTop: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4
            }}>
                <span>⚠️</span>
                <span>{message}</span>
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit} style={{
            background: theme.colors.panel,
            borderRadius: theme.radii.lg,
            boxShadow: theme.shadow,
            padding: 24,
            border: `1px solid ${theme.colors.border}`,
            display: "flex",
            flexDirection: "column",
            gap: 24
        }}>
            <div>
                <h2 style={{ fontSize: 20, fontWeight: 600, color: theme.colors.text, margin: 0 }}>Project Details</h2>
                <p style={{ fontSize: 14, color: theme.colors.textSubtle, margin: 0, marginTop: 4 }}>High-level information for this quote.</p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 16 }}>
                 <div>
                    <label htmlFor="quoteRef" style={{ display: "block", fontSize: 14, fontWeight: 500, color: theme.colors.text, marginBottom: 4 }}>Quote Ref</label>
                    <input type="text" name="quoteRef" id="quoteRef" value={details.quoteRef} onChange={handleDetailChange} style={{
                        display: "block",
                        width: "100%",
                        padding: "8px 12px",
                        background: theme.colors.panelAlt,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radii.md,
                        color: theme.colors.text,
                        fontSize: 14
                    }} />
                </div>
                 <div>
                    <label htmlFor="client" style={{ display: "block", fontSize: 14, fontWeight: 500, color: theme.colors.text, marginBottom: 4 }}>
                        Client <span style={{ color: theme.colors.danger }}>*</span>
                    </label>
                    <input
                        type="text"
                        name="client"
                        id="client"
                        value={details.client}
                        onChange={handleDetailChange}
                        onBlur={() => validateFieldOnBlur('client', details.client, details)}
                        style={{
                            display: "block",
                            width: "100%",
                            padding: "8px 12px",
                            background: theme.colors.panelAlt,
                            border: `1px solid ${getFieldError('client') ? theme.colors.danger : theme.colors.border}`,
                            borderRadius: theme.radii.md,
                            color: theme.colors.text,
                            fontSize: 14
                        }}
                    />
                    <ErrorMessage message={getFieldError('client')} />
                </div>
                <div>
                    <label htmlFor="project" style={{ display: "block", fontSize: 14, fontWeight: 500, color: theme.colors.text, marginBottom: 4 }}>
                        Project <span style={{ color: theme.colors.danger }}>*</span>
                    </label>
                    <input
                        type="text"
                        name="project"
                        id="project"
                        value={details.project}
                        onChange={handleDetailChange}
                        onBlur={() => validateFieldOnBlur('project', details.project, details)}
                        style={{
                            display: "block",
                            width: "100%",
                            padding: "8px 12px",
                            background: theme.colors.panelAlt,
                            border: `1px solid ${getFieldError('project') ? theme.colors.danger : theme.colors.border}`,
                            borderRadius: theme.radii.md,
                            color: theme.colors.text,
                            fontSize: 14
                        }}
                    />
                    <ErrorMessage message={getFieldError('project')} />
                </div>
                <div>
                    <label htmlFor="deliveryAddress" style={{ display: "block", fontSize: 14, fontWeight: 500, color: theme.colors.text, marginBottom: 4 }}>
                        Delivery Address <span style={{ color: theme.colors.danger }}>*</span>
                    </label>
                    <input
                        type="text"
                        name="deliveryAddress"
                        id="deliveryAddress"
                        value={details.deliveryAddress}
                        onChange={handleDetailChange}
                        onBlur={() => validateFieldOnBlur('deliveryAddress', details.deliveryAddress, details)}
                        placeholder="Postcode is required"
                        style={{
                            display: "block",
                            width: "100%",
                            padding: "8px 12px",
                            background: theme.colors.panelAlt,
                            border: `1px solid ${getFieldError('deliveryAddress') ? theme.colors.danger : theme.colors.border}`,
                            borderRadius: theme.radii.md,
                            color: theme.colors.text,
                            fontSize: 14
                        }}
                    />
                    <ErrorMessage message={getFieldError('deliveryAddress')} />
                </div>
                 <div style={{ gridColumn: "1 / -1" }}>
                    <label htmlFor="preparedBy" style={{ display: "block", fontSize: 14, fontWeight: 500, color: theme.colors.text, marginBottom: 4 }}>Prepared By</label>
                     <select name="preparedBy" id="preparedBy" value={details.preparedBy} onChange={handleDetailChange} 
                            className="glassmorphic-base glassmorphic-dropdown"
                            style={{
                                ...getGlassmorphicStyle('dropdown'),
                                display: "block",
                                width: "100%",
                                padding: "12px 16px",
                                fontSize: 14,
                                fontWeight: 500,
                                outline: 'none'
                            }}
                            onFocus={(e) => {
                                e.currentTarget.style.border = `1px solid ${theme.colors.accent}`;
                                e.currentTarget.style.boxShadow = `
                                    inset 0 1px 0 rgba(255,255,255,0.35),
                                    0 8px 20px rgba(0,0,0,0.35),
                                    0 0 0 3px ${theme.colors.accent}20
                                `;
                            }}
                            onBlur={(e) => {
                                e.currentTarget.style.border = '1px solid rgba(255,255,255,0.28)';
                                e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.35), 0 8px 20px rgba(0,0,0,0.35)';
                            }}
                     >
                        {config.rules.preparedByOptions.map(name => (
                            <option key={name} value={name} style={{ 
                                background: 'rgba(16, 20, 32, 0.95)', 
                                color: theme.colors.text,
                                padding: '8px 12px'
                            }}>{name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div style={{ height: 1, background: theme.colors.border, margin: "8px 0" }} />

             <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: theme.colors.text, margin: 0 }}>Site Conditions & Services</h3>
                 <p style={{ fontSize: 14, color: theme.colors.textSubtle, margin: 0, marginTop: 4, marginBottom: 16 }}>Select conditions and services that affect time or cost.</p>
                 <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                     <button
                        type="button"
                        onClick={() => handleDetailChange({ target: { name: 'upliftViaStairs', type: 'checkbox', checked: !details.upliftViaStairs } } as React.ChangeEvent<HTMLInputElement>)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            background: details.upliftViaStairs ? theme.colors.accent : theme.colors.panelAlt,
                            color: details.upliftViaStairs ? "white" : theme.colors.text,
                            border: `1px solid ${details.upliftViaStairs ? theme.colors.accent : theme.colors.border}`,
                            padding: 16,
                            borderRadius: theme.radii.md,
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 500,
                            transition: "all 0.2s ease",
                            width: "100%",
                            textAlign: "left"
                        }}
                        onMouseOver={(e) => {
                            if (!details.upliftViaStairs) {
                                e.currentTarget.style.background = theme.colors.muted;
                                e.currentTarget.style.borderColor = theme.colors.accent;
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!details.upliftViaStairs) {
                                e.currentTarget.style.background = theme.colors.panelAlt;
                                e.currentTarget.style.borderColor = theme.colors.border;
                            }
                        }}>
                        <BuildingIcon style={{ height: 20, width: 20, color: details.upliftViaStairs ? "white" : theme.colors.accent }} />
                        <span style={{ flex: 1 }}>Uplift via stairs</span>
                        <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: details.upliftViaStairs ? "white" : "transparent",
                            border: `2px solid ${details.upliftViaStairs ? "white" : theme.colors.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            {details.upliftViaStairs && <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.colors.accent }} />}
                        </div>
                     </button>
                     <button
                        type="button"
                        onClick={() => handleDetailChange({ target: { name: 'extendedUplift', type: 'checkbox', checked: !details.extendedUplift } } as React.ChangeEvent<HTMLInputElement>)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            background: details.extendedUplift ? theme.colors.accent : theme.colors.panelAlt,
                            color: details.extendedUplift ? "white" : theme.colors.text,
                            border: `1px solid ${details.extendedUplift ? theme.colors.accent : theme.colors.border}`,
                            padding: 16,
                            borderRadius: theme.radii.md,
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 500,
                            transition: "all 0.2s ease",
                            width: "100%",
                            textAlign: "left"
                        }}
                        onMouseOver={(e) => {
                            if (!details.extendedUplift) {
                                e.currentTarget.style.background = theme.colors.muted;
                                e.currentTarget.style.borderColor = theme.colors.accent;
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!details.extendedUplift) {
                                e.currentTarget.style.background = theme.colors.panelAlt;
                                e.currentTarget.style.borderColor = theme.colors.border;
                            }
                        }}>
                        <ArrowTrendingUpIcon style={{ height: 20, width: 20, color: details.extendedUplift ? "white" : theme.colors.accent }} />
                        <span style={{ flex: 1 }}>Extended uplift</span>
                        <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: details.extendedUplift ? "white" : "transparent",
                            border: `2px solid ${details.extendedUplift ? "white" : theme.colors.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            {details.extendedUplift && <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.colors.accent }} />}
                        </div>
                     </button>
                     
                     {details.extendedUplift && (
                        <div style={{
                            marginLeft: 32,
                            padding: 16,
                            background: theme.colors.panelAlt,
                            borderRadius: theme.radii.md,
                            border: `1px solid ${theme.colors.border}`,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 16
                        }}>
                            <h4 style={{
                                fontSize: 16,
                                fontWeight: 600,
                                color: theme.colors.text,
                                margin: 0
                            }}>Extended Uplift Configuration</h4>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <label style={{
                                        display: "block",
                                        fontSize: 14,
                                        fontWeight: 500,
                                        color: theme.colors.text,
                                        marginBottom: 8
                                    }}>Uplift Days</label>
                                    <input
                                        type="number"
                                        name="customExtendedUpliftDays"
                                        min="0"
                                        step="1"
                                        placeholder="e.g. 2"
                                        value={details.customExtendedUpliftDays ?? ''}
                                        onChange={handleDetailChange}
                                        style={{
                                            display: "block",
                                            width: "100%",
                                            padding: "8px 12px",
                                            background: theme.colors.panel,
                                            border: `1px solid ${theme.colors.border}`,
                                            borderRadius: theme.radii.sm,
                                            color: theme.colors.text,
                                            fontSize: 14
                                        }}
                                    />
                                </div>
                                
                                <div>
                                    <label style={{
                                        display: "block",
                                        fontSize: 14,
                                        fontWeight: 500,
                                        color: theme.colors.text,
                                        marginBottom: 8
                                    }}>Uplift Fitters</label>
                                    <input
                                        type="number"
                                        name="customExtendedUpliftFitters"
                                        min="1"
                                        max="8"
                                        step="1"
                                        placeholder="e.g. 6 (default)"
                                        value={details.customExtendedUpliftFitters ?? ''}
                                        onChange={handleDetailChange}
                                        style={{
                                            display: "block",
                                            width: "100%",
                                            padding: "8px 12px",
                                            background: theme.colors.panel,
                                            border: `1px solid ${theme.colors.border}`,
                                            borderRadius: theme.radii.sm,
                                            color: theme.colors.text,
                                            fontSize: 14
                                        }}
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <button
                                    type="button"
                                    onClick={() => handleDetailChange({ target: { name: 'upliftSupervisor', type: 'checkbox', checked: !details.upliftSupervisor } } as React.ChangeEvent<HTMLInputElement>)}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                        background: details.upliftSupervisor ? theme.colors.accent : 'transparent',
                                        color: details.upliftSupervisor ? "white" : theme.colors.text,
                                        border: `1px solid ${details.upliftSupervisor ? theme.colors.accent : theme.colors.border}`,
                                        padding: 12,
                                        borderRadius: theme.radii.sm,
                                        cursor: "pointer",
                                        fontSize: 14,
                                        fontWeight: 500,
                                        transition: "all 0.2s ease",
                                        width: "100%",
                                        textAlign: "left"
                                    }}
                                    onMouseOver={(e) => {
                                        if (!details.upliftSupervisor) {
                                            e.currentTarget.style.background = theme.colors.muted;
                                            e.currentTarget.style.borderColor = theme.colors.accent;
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!details.upliftSupervisor) {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.borderColor = theme.colors.border;
                                        }
                                    }}>
                                    <UserGroupIcon style={{ height: 16, width: 16, color: details.upliftSupervisor ? "white" : theme.colors.accent }} />
                                    <span style={{ flex: 1 }}>Include Uplift Supervisor</span>
                                    <div style={{
                                        width: 16,
                                        height: 16,
                                        borderRadius: "50%",
                                        background: details.upliftSupervisor ? "white" : "transparent",
                                        border: `2px solid ${details.upliftSupervisor ? "white" : theme.colors.border}`,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center"
                                    }}>
                                        {details.upliftSupervisor && <div style={{ width: 6, height: 6, borderRadius: "50%", background: theme.colors.accent }} />}
                                    </div>
                                </button>
                            </div>
                            
                            <p style={{
                                fontSize: 12,
                                color: theme.colors.textSubtle,
                                margin: 0,
                                fontStyle: 'italic'
                            }}>Configure separate crew for extended uplift work. Defaults: 6 fitters, no supervisor.</p>
                        </div>
                     )}
                     <button
                        type="button"
                        onClick={() => handleDetailChange({ target: { name: 'specialistReworking', type: 'checkbox', checked: !details.specialistReworking } } as React.ChangeEvent<HTMLInputElement>)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            background: details.specialistReworking ? theme.colors.accent : theme.colors.panelAlt,
                            color: details.specialistReworking ? "white" : theme.colors.text,
                            border: `1px solid ${details.specialistReworking ? theme.colors.accent : theme.colors.border}`,
                            padding: 16,
                            borderRadius: theme.radii.md,
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 500,
                            transition: "all 0.2s ease",
                            width: "100%",
                            textAlign: "left"
                        }}
                        onMouseOver={(e) => {
                            if (!details.specialistReworking) {
                                e.currentTarget.style.background = theme.colors.muted;
                                e.currentTarget.style.borderColor = theme.colors.accent;
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!details.specialistReworking) {
                                e.currentTarget.style.background = theme.colors.panelAlt;
                                e.currentTarget.style.borderColor = theme.colors.border;
                            }
                        }}>
                        <WrenchIcon style={{ height: 20, width: 20, color: details.specialistReworking ? "white" : theme.colors.accent }} />
                        <span style={{ flex: 1 }}>Specialist work</span>
                        <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: details.specialistReworking ? "white" : "transparent",
                            border: `2px solid ${details.specialistReworking ? "white" : theme.colors.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            {details.specialistReworking && <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.colors.accent }} />}
                        </div>
                     </button>
                     <button
                        type="button"
                        onClick={() => handleDetailChange({ target: { name: 'manuallyAddSupervisor', type: 'checkbox', checked: !details.manuallyAddSupervisor } } as React.ChangeEvent<HTMLInputElement>)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            background: details.manuallyAddSupervisor ? theme.colors.accent : theme.colors.panelAlt,
                            color: details.manuallyAddSupervisor ? "white" : theme.colors.text,
                            border: `1px solid ${details.manuallyAddSupervisor ? theme.colors.accent : theme.colors.border}`,
                            padding: 16,
                            borderRadius: theme.radii.md,
                            cursor: "pointer",
                            fontSize: 14,
                            fontWeight: 500,
                            transition: "all 0.2s ease",
                            width: "100%",
                            textAlign: "left"
                        }}
                        onMouseOver={(e) => {
                            if (!details.manuallyAddSupervisor) {
                                e.currentTarget.style.background = theme.colors.muted;
                                e.currentTarget.style.borderColor = theme.colors.accent;
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!details.manuallyAddSupervisor) {
                                e.currentTarget.style.background = theme.colors.panelAlt;
                                e.currentTarget.style.borderColor = theme.colors.border;
                            }
                        }}>
                        <UserGroupIcon style={{ height: 20, width: 20, color: details.manuallyAddSupervisor ? "white" : theme.colors.accent }} />
                        <span style={{ flex: 1 }}>Add supervisor</span>
                        <div style={{
                            width: 20,
                            height: 20,
                            borderRadius: "50%",
                            background: details.manuallyAddSupervisor ? "white" : "transparent",
                            border: `2px solid ${details.manuallyAddSupervisor ? "white" : theme.colors.border}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            {details.manuallyAddSupervisor && <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.colors.accent }} />}
                        </div>
                     </button>
                 </div>
            </div>

            <div style={{ height: 1, background: theme.colors.border, margin: "8px 0" }} />
            
            {/* Out-of-Hours Working Section */}
            <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: theme.colors.text, margin: 0 }}>Out-of-Hours Working</h3>
                <p style={{ fontSize: 14, color: theme.colors.textSubtle, margin: 0, marginTop: 4, marginBottom: 16 }}>Configure premium rates for evening, weekend, or holiday work.</p>
                
                <button
                    type="button"
                    onClick={() => handleDetailChange({ target: { name: 'outOfHoursWorking', type: 'checkbox', checked: !details.outOfHoursWorking } } as React.ChangeEvent<HTMLInputElement>)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        background: details.outOfHoursWorking ? theme.colors.accent : theme.colors.panelAlt,
                        color: details.outOfHoursWorking ? "white" : theme.colors.text,
                        border: `1px solid ${details.outOfHoursWorking ? theme.colors.accent : theme.colors.border}`,
                        padding: 16,
                        borderRadius: theme.radii.md,
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 500,
                        transition: "all 0.2s ease",
                        width: "100%",
                        textAlign: "left",
                        marginBottom: 16
                    }}
                    onMouseOver={(e) => {
                        if (!details.outOfHoursWorking) {
                            e.currentTarget.style.background = theme.colors.muted;
                            e.currentTarget.style.borderColor = theme.colors.accent;
                        }
                    }}
                    onMouseOut={(e) => {
                        if (!details.outOfHoursWorking) {
                            e.currentTarget.style.background = theme.colors.panelAlt;
                            e.currentTarget.style.borderColor = theme.colors.border;
                        }
                    }}>
                    <BuildingIcon style={{ height: 20, width: 20, color: details.outOfHoursWorking ? "white" : theme.colors.accent }} />
                    <span style={{ flex: 1 }}>Enable Out-of-Hours Rates</span>
                    <div style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: details.outOfHoursWorking ? "white" : "transparent",
                        border: `2px solid ${details.outOfHoursWorking ? "white" : theme.colors.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}>
                        {details.outOfHoursWorking && <div style={{ width: 8, height: 8, borderRadius: "50%", background: theme.colors.accent }} />}
                    </div>
                </button>
                
                {details.outOfHoursWorking && (
                    <div style={{
                        padding: 16,
                        background: theme.colors.panelAlt,
                        borderRadius: theme.radii.md,
                        border: `1px solid ${theme.colors.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 16
                    }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={{
                                    display: "block",
                                    fontSize: 14,
                                    fontWeight: 500,
                                    color: theme.colors.text,
                                    marginBottom: 8
                                }}>Out-of-Hours Type</label>
                                <select
                                    name="outOfHoursType"
                                    value={details.outOfHoursType ?? ''}
                                    onChange={handleDetailChange}
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "8px 12px",
                                        background: theme.colors.panel,
                                        border: `1px solid ${theme.colors.border}`,
                                        borderRadius: theme.radii.sm,
                                        color: theme.colors.text,
                                        fontSize: 14
                                    }}>
                                    <option value="">Select type...</option>
                                    <option value="weekday_evening">Weekday Evening (6pm-7am) - 150%</option>
                                    <option value="saturday">Saturday - 200%</option>
                                    <option value="sunday_bank_holiday">Sunday/Bank Holiday - 225%</option>
                                </select>
                            </div>
                            
                            <div>
                                <label style={{
                                    display: "block",
                                    fontSize: 14,
                                    fontWeight: 500,
                                    color: theme.colors.text,
                                    marginBottom: 8
                                }}>Days at Premium Rate</label>
                                <input
                                    type="number"
                                    name="outOfHoursDays"
                                    min="0"
                                    step="0.5"
                                    placeholder="e.g. 2 or 1.5"
                                    value={details.outOfHoursDays ?? ''}
                                    onChange={handleDetailChange}
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        padding: "8px 12px",
                                        background: theme.colors.panel,
                                        border: `1px solid ${theme.colors.border}`,
                                        borderRadius: theme.radii.sm,
                                        color: theme.colors.text,
                                        fontSize: 14
                                    }}
                                />
                            </div>
                        </div>
                        
                        <p style={{
                            fontSize: 12,
                            color: theme.colors.textSubtle,
                            margin: 0,
                            fontStyle: 'italic'
                        }}>Premium rates apply only to labour costs (van, fitters, supervisors). Transport, parking, and specialist work remain at standard rates.</p>
                    </div>
                )}
            </div>
            
            <div style={{ height: 1, background: theme.colors.border, margin: "8px 0" }} />
             <div>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: theme.colors.text, margin: 0 }}>Calculation Overrides</h3>
                 <p style={{ fontSize: 14, color: theme.colors.textSubtle, margin: 0, marginTop: 4, marginBottom: 16 }}>Manually adjust calculated values if needed.</p>
                 <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
                    <div>
                        <label style={{ 
                            display: "block", 
                            fontSize: 14, 
                            fontWeight: 500, 
                            color: theme.colors.text, 
                            marginBottom: 8 
                        }}>Manual Waste Override (m³)</label>
                        <div style={{ position: "relative" }}>
                            <div style={{
                                position: "absolute",
                                left: 12,
                                top: "50%",
                                transform: "translateY(-50%)",
                                pointerEvents: "none"
                            }}>
                               <TrashIcon style={{ height: 16, width: 16, color: theme.colors.textSubtle }} />
                            </div>
                            <input
                                type="number"
                                name="overrideWasteVolumeM3"
                                id="overrideWasteVolumeM3"
                                value={details.overrideWasteVolumeM3 ?? ''}
                                onChange={handleDetailChange}
                                placeholder="e.g., 5.5"
                                step="0.1"
                                min="0"
                                style={{
                                    display: "block",
                                    width: "100%",
                                    padding: "12px 16px 12px 40px",
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
                    </div>
                 </div>
            </div>

            {/* Vehicle Selection Section */}
            <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                    <TruckIcon style={{ height: 24, width: 24, color: theme.colors.accent }} />
                    <h3 style={{ 
                        fontSize: 18,
                        fontWeight: 600,
                        color: theme.colors.text,
                        margin: 0
                    }}>
                        Transport Vehicles
                    </h3>
                </div>
                <p style={{
                    fontSize: 14,
                    color: theme.colors.textSubtle,
                    margin: "0 0 16px 0",
                    lineHeight: 1.4
                }}>
                    Select additional transport vehicles if needed for this project. Costs are calculated per working day.
                </p>
                
                <div style={{ display: "grid", gap: 12 }}>
                    {Object.entries(config.vehicles).filter(([_, vehicle]) => vehicle.isActive).map(([vehicleId, vehicle]) => {
                        const quantity = (details.selectedVehicles || {})[vehicleId] || 0;
                        const isSelected = quantity > 0;
                        return (
                            <div
                                key={vehicleId}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: 16,
                                    background: isSelected ? theme.colors.muted : theme.colors.panelAlt,
                                    border: `1px solid ${isSelected ? theme.colors.accent : theme.colors.border}`,
                                    borderRadius: theme.radii.md,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    transition: "all 0.2s ease"
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 600, marginBottom: 4, color: theme.colors.text }}>
                                        {vehicle.name}
                                    </div>
                                    <div style={{ 
                                        fontSize: 12, 
                                        color: theme.colors.textSubtle
                                    }}>
                                        Euro: {vehicle.euroPalletCapacity} pallets | Standard: {vehicle.standardPalletCapacity} pallets
                                    </div>
                                </div>
                                <div style={{ 
                                    fontSize: 16, 
                                    fontWeight: 700,
                                    color: theme.colors.accent,
                                    marginRight: 16
                                }}>
                                    £{vehicle.costPerDay}/day
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <span style={{ fontSize: 14, color: theme.colors.text, minWidth: 30 }}>Qty:</span>
                                    <input
                                        type="number"
                                        min="0"
                                        max="20"
                                        value={quantity}
                                        onChange={(e) => handleVehicleQuantityChange(vehicleId, parseInt(e.target.value, 10) || 0)}
                                        style={{
                                            width: 60,
                                            padding: "6px 8px",
                                            border: `1px solid ${theme.colors.border}`,
                                            borderRadius: 4,
                                            backgroundColor: theme.colors.panel,
                                            color: theme.colors.text,
                                            fontSize: 14,
                                            textAlign: "center"
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = theme.colors.accent;
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = theme.colors.border;
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {onSubmit && submitButtonText && (
                <>
                <div style={{ height: 1, background: theme.colors.border, margin: "16px 0" }} />
                <button
                    type="submit"
                    style={{
                        width: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        padding: "12px 24px",
                        border: "none",
                        fontSize: 16,
                        fontWeight: 600,
                        borderRadius: theme.radii.md,
                        background: theme.colors.accentAlt,
                        color: "white",
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = "#16a34a"}
                    onMouseOut={(e) => e.currentTarget.style.background = theme.colors.accentAlt}
                >
                    {submitButtonText}
                </button>
                </>
            )}
        </form>
    );
};
