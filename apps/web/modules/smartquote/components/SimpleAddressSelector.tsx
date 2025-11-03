import React, { useState, useEffect } from 'react';
import { theme } from '../../../lib/theme';

interface AddressOption {
    value: string;
    label: string;
    address: string;
    type: 'recent' | 'suggested' | 'custom';
}

interface SimpleAddressSelectorProps {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    error?: string;
    placeholder?: string;
    parsedAddresses?: string[]; // Addresses from parsed quote
}

export const SimpleAddressSelector: React.FC<SimpleAddressSelectorProps> = ({
    value,
    onChange,
    onBlur,
    error,
    placeholder = "Site postcode (where work will be done)",
    parsedAddresses = []
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [customInput, setCustomInput] = useState(value);
    const [mode, setMode] = useState<'select' | 'custom'>('select');

    // Sample common addresses (in production, these would come from database)
    const recentAddresses: AddressOption[] = [
        {
            value: 'london-ec1',
            label: 'London EC1 (Recent)',
            address: 'Unit 5, The Leather Market\nWeston Street\nLondon\nSE1 3ER',
            type: 'recent'
        },
        {
            value: 'london-w1',
            label: 'London W1 (Recent)',
            address: '42 Berkeley Square\nMayfair\nLondon\nW1J 5AW',
            type: 'recent'
        },
        {
            value: 'canary-wharf',
            label: 'Canary Wharf (Recent)',
            address: 'One Canada Square\nCanary Wharf\nLondon\nE14 5AB',
            type: 'recent'
        }
    ];

    // Convert parsed addresses to options
    const parsedOptions: AddressOption[] = parsedAddresses.map((addr, index) => {
        // Extract postcode from address
        const postcodeMatch = addr.match(/([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})/i);
        const label = postcodeMatch ? `Detected: ${postcodeMatch[0]}` : `Detected Address ${index + 1}`;

        return {
            value: `parsed-${index}`,
            label: label,
            address: addr,
            type: 'suggested'
        };
    });

    const allOptions = [...parsedOptions, ...recentAddresses];

    useEffect(() => {
        // Auto-select first parsed address if available and no value set
        if (parsedOptions.length > 0 && !value) {
            onChange(parsedOptions[0].address);
        }
    }, [parsedAddresses]);

    const handleSelect = (option: AddressOption) => {
        onChange(option.address);
        setCustomInput(option.address);
        setIsOpen(false);
        setMode('select');
    };

    const handleCustomSubmit = () => {
        onChange(customInput);
        setIsOpen(false);
        setMode('select');
    };

    const formatAddress = (address: string) => {
        const lines = address.split('\n');
        if (lines.length > 2) {
            return `${lines[0]}... ${lines[lines.length - 1]}`;
        }
        return address;
    };

    if (!isOpen && value) {
        return (
            <div
                onClick={() => setIsOpen(true)}
                style={{
                    padding: "8px 12px",
                    background: theme.colors.panelAlt,
                    border: `1px solid ${error ? theme.colors.danger : theme.colors.border}`,
                    borderRadius: theme.radii.md,
                    cursor: 'pointer',
                    minHeight: 38
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, color: theme.colors.text }}>
                        {formatAddress(value)}
                    </span>
                    <span style={{ fontSize: 12, color: theme.colors.textSubtle }}>
                        Click to change
                    </span>
                </div>
            </div>
        );
    }

    if (!isOpen) {
        return (
            <div
                onClick={() => setIsOpen(true)}
                style={{
                    padding: "8px 12px",
                    background: theme.colors.panelAlt,
                    border: `1px solid ${error ? theme.colors.danger : theme.colors.border}`,
                    borderRadius: theme.radii.md,
                    cursor: 'pointer',
                    minHeight: 38
                }}
            >
                <span style={{ fontSize: 14, color: theme.colors.textSubtle }}>
                    {parsedOptions.length > 0 ? 'Click to select from detected addresses' : placeholder}
                </span>
            </div>
        );
    }

    return (
        <div style={{ position: 'relative' }}>
            <div style={{
                background: theme.colors.panel,
                border: `2px solid ${theme.colors.accent}`,
                borderRadius: theme.radii.md,
                padding: 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
                {mode === 'select' ? (
                    <>
                        <div style={{ marginBottom: 12 }}>
                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.colors.text }}>
                                Select Address
                            </h4>
                            {parsedOptions.length > 0 && (
                                <p style={{ margin: '4px 0 0', fontSize: 12, color: theme.colors.success }}>
                                    ✓ Found {parsedOptions.length} address{parsedOptions.length > 1 ? 'es' : ''} in quote
                                </p>
                            )}
                        </div>

                        {/* Detected addresses from quote */}
                        {parsedOptions.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 500, color: theme.colors.textSubtle, marginBottom: 8 }}>
                                    From Quote:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {parsedOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => handleSelect(option)}
                                            style={{
                                                padding: '8px 12px',
                                                background: theme.colors.panelAlt,
                                                border: `1px solid ${theme.colors.border}`,
                                                borderRadius: theme.radii.sm,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.background = theme.colors.muted;
                                                e.currentTarget.style.borderColor = theme.colors.accent;
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.background = theme.colors.panelAlt;
                                                e.currentTarget.style.borderColor = theme.colors.border;
                                            }}
                                        >
                                            <div style={{ fontSize: 12, fontWeight: 500, color: theme.colors.success, marginBottom: 2 }}>
                                                {option.label}
                                            </div>
                                            <div style={{ fontSize: 11, color: theme.colors.textSubtle, whiteSpace: 'pre-wrap' }}>
                                                {option.address}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Recent addresses */}
                        {recentAddresses.length > 0 && (
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 12, fontWeight: 500, color: theme.colors.textSubtle, marginBottom: 8 }}>
                                    Recent Addresses:
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {recentAddresses.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => handleSelect(option)}
                                            style={{
                                                padding: '8px 12px',
                                                background: theme.colors.panelAlt,
                                                border: `1px solid ${theme.colors.border}`,
                                                borderRadius: theme.radii.sm,
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.background = theme.colors.muted;
                                                e.currentTarget.style.borderColor = theme.colors.accent;
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.background = theme.colors.panelAlt;
                                                e.currentTarget.style.borderColor = theme.colors.border;
                                            }}
                                        >
                                            <div style={{ fontSize: 12, fontWeight: 500, color: theme.colors.text, marginBottom: 2 }}>
                                                {option.label}
                                            </div>
                                            <div style={{ fontSize: 11, color: theme.colors.textSubtle, whiteSpace: 'pre-wrap' }}>
                                                {option.address}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button
                                onClick={() => {
                                    setMode('custom');
                                    setCustomInput(value);
                                }}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    background: theme.colors.accent,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: theme.radii.sm,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                Enter Custom Address
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                style={{
                                    padding: '8px 12px',
                                    background: theme.colors.muted,
                                    color: theme.colors.text,
                                    border: `1px solid ${theme.colors.border}`,
                                    borderRadius: theme.radii.sm,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        <div style={{ marginBottom: 12 }}>
                            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: theme.colors.text }}>
                                Enter Custom Address
                            </h4>
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: theme.colors.textSubtle }}>
                                Format: Company Name, Street, City, Postcode
                            </p>
                        </div>

                        <textarea
                            value={customInput}
                            onChange={(e) => setCustomInput(e.target.value)}
                            placeholder="e.g.:\nRawside Furniture Ltd\nUnit 5, The Leather Market\nWeston Street\nLondon\nSE1 3ER"
                            style={{
                                width: '100%',
                                minHeight: 120,
                                padding: '8px 12px',
                                background: theme.colors.panelAlt,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.radii.sm,
                                fontSize: 13,
                                fontFamily: 'inherit',
                                resize: 'vertical'
                            }}
                        />

                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button
                                onClick={handleCustomSubmit}
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    background: theme.colors.success,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: theme.radii.sm,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                Use This Address
                            </button>
                            <button
                                onClick={() => setMode('select')}
                                style={{
                                    padding: '8px 12px',
                                    background: theme.colors.muted,
                                    color: theme.colors.text,
                                    border: `1px solid ${theme.colors.border}`,
                                    borderRadius: theme.radii.sm,
                                    fontSize: 14,
                                    fontWeight: 500,
                                    cursor: 'pointer'
                                }}
                            >
                                Back
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SimpleAddressSelector;