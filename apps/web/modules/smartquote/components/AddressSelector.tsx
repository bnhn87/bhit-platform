import React, { useState, useEffect } from 'react';

import { theme } from '../../../lib/theme';

import { MapPinIcon, BuildingOfficeIcon, TruckIcon, PlusCircleIcon, CheckCircleIcon } from './icons';

export interface Address {
    type: 'site' | 'collection' | 'client' | 'custom';
    label: string;
    fullAddress: string;
    postcode: string;
    distance?: number; // Miles from base
    isValid: boolean;
}

interface AddressSelectorProps {
    detectedAddresses: Address[];
    selectedSiteAddress: string;
    selectedCollectionAddress?: string;
    onSiteAddressSelect: (address: string) => void;
    onCollectionAddressSelect?: (address: string) => void;
    clientName?: string;
}

// UK Address format validator
const validateUKAddressFormat = (address: string): { isValid: boolean; postcode: string | null; formatted: string } => {
    const lines = address.trim().split('\n').filter(line => line.trim());
    const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i;

    // Check if last line is a valid UK postcode
    const lastLine = lines[lines.length - 1];
    const postcodeMatch = lastLine.match(postcodeRegex);

    if (!postcodeMatch || lines.length < 3) {
        return { isValid: false, postcode: null, formatted: address };
    }

    // Format address properly
    const formatted = lines.map(line => line.trim()).join('\n');

    return {
        isValid: true,
        postcode: postcodeMatch[0].toUpperCase(),
        formatted
    };
};

// Parse address from text to extract postcode and create Address object
const parseAddressFromText = (text: string, type: Address['type'] = 'custom', label: string = 'Custom Address'): Address | null => {
    const validation = validateUKAddressFormat(text);

    if (!validation.isValid || !validation.postcode) {
        return null;
    }

    return {
        type,
        label,
        fullAddress: validation.formatted,
        postcode: validation.postcode,
        isValid: true
    };
};

export const AddressSelector: React.FC<AddressSelectorProps> = ({
    detectedAddresses,
    selectedSiteAddress,
    selectedCollectionAddress,
    onSiteAddressSelect,
    onCollectionAddressSelect,
    clientName
}) => {
    const [showCustomEntry, setShowCustomEntry] = useState(false);
    const [customAddressText, setCustomAddressText] = useState('');
    const [customAddressType, setCustomAddressType] = useState<'site' | 'collection'>('site');
    const [validationError, setValidationError] = useState<string | null>(null);

    // Example format text
    const exampleFormat = `Example format:
Rawside Furniture Ltd
Unit 5, The Leather Market
Weston Street
London
SE1 3ER`;

    const handleCustomAddressSubmit = () => {
        const parsed = parseAddressFromText(customAddressText, customAddressType);

        if (!parsed) {
            setValidationError('Invalid address format. Please ensure you include a valid UK postcode on the last line.');
            return;
        }

        // Add to appropriate field
        if (customAddressType === 'site') {
            onSiteAddressSelect(parsed.fullAddress);
        } else if (onCollectionAddressSelect) {
            onCollectionAddressSelect(parsed.fullAddress);
        }

        // Reset form
        setCustomAddressText('');
        setShowCustomEntry(false);
        setValidationError(null);
    };

    const getAddressIcon = (type: Address['type']) => {
        switch (type) {
            case 'site':
                return <MapPinIcon style={{ width: 20, height: 20, color: theme.colors.accent }} />;
            case 'collection':
                return <TruckIcon style={{ width: 20, height: 20, color: theme.colors.warn }} />;
            case 'client':
                return <BuildingOfficeIcon style={{ width: 20, height: 20, color: theme.colors.accentAlt }} />;
            default:
                return <MapPinIcon style={{ width: 20, height: 20, color: theme.colors.textSubtle }} />;
        }
    };

    if (detectedAddresses.length === 0 && !showCustomEntry) {
        return null;
    }

    return (
        <div style={{
            background: theme.colors.panel,
            borderRadius: theme.radii.lg,
            padding: 20,
            border: `1px solid ${theme.colors.border}`,
            marginBottom: 20
        }}>
            <h3 style={{
                fontSize: 16,
                fontWeight: 600,
                color: theme.colors.text,
                marginBottom: 16
            }}>
                📍 Address Selection
            </h3>

            {detectedAddresses.length > 0 && (
                <div style={{
                    background: theme.colors.accentAlt + '10',
                    border: `1px solid ${theme.colors.accentAlt}40`,
                    borderRadius: theme.radii.md,
                    padding: 12,
                    marginBottom: 16
                }}>
                    <p style={{
                        fontSize: 14,
                        color: theme.colors.accentAlt,
                        margin: 0
                    }}>
                        Multiple addresses detected in the quote. Please select the correct ones:
                    </p>
                </div>
            )}

            {/* Site Address Selection */}
            <div style={{ marginBottom: 20 }}>
                <label style={{
                    fontSize: 14,
                    fontWeight: 500,
                    color: theme.colors.text,
                    display: 'block',
                    marginBottom: 8
                }}>
                    Site/Installation Address
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {detectedAddresses.filter(addr => addr.type === 'site' || addr.type === 'custom').map((address, index) => (
                        <button
                            key={`site-${index}`}
                            onClick={() => onSiteAddressSelect(address.fullAddress)}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 12,
                                padding: 12,
                                background: selectedSiteAddress === address.fullAddress
                                    ? theme.colors.accent + '20'
                                    : theme.colors.panelAlt,
                                border: `1px solid ${selectedSiteAddress === address.fullAddress
                                    ? theme.colors.accent
                                    : theme.colors.border}`,
                                borderRadius: theme.radii.md,
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseOver={(e) => {
                                if (selectedSiteAddress !== address.fullAddress) {
                                    e.currentTarget.style.background = theme.colors.muted;
                                }
                            }}
                            onMouseOut={(e) => {
                                if (selectedSiteAddress !== address.fullAddress) {
                                    e.currentTarget.style.background = theme.colors.panelAlt;
                                }
                            }}
                        >
                            {getAddressIcon(address.type)}
                            <div style={{ flex: 1 }}>
                                <div style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: theme.colors.text,
                                    marginBottom: 4
                                }}>
                                    {address.label}
                                </div>
                                <div style={{
                                    fontSize: 12,
                                    color: theme.colors.textSubtle,
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {address.fullAddress}
                                </div>
                                <div style={{
                                    fontSize: 11,
                                    color: theme.colors.accent,
                                    marginTop: 4
                                }}>
                                    Postcode: {address.postcode}
                                    {address.distance && ` • ${address.distance} miles from base`}
                                </div>
                            </div>
                            {selectedSiteAddress === address.fullAddress && (
                                <CheckCircleIcon style={{
                                    width: 20,
                                    height: 20,
                                    color: theme.colors.success
                                }} />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Collection Address Selection (Optional) */}
            {onCollectionAddressSelect && (
                <div style={{ marginBottom: 20 }}>
                    <label style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: theme.colors.text,
                        display: 'block',
                        marginBottom: 8
                    }}>
                        Collection Address (if different from site)
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {detectedAddresses.filter(addr => addr.type === 'collection' || addr.type === 'client').map((address, index) => (
                            <button
                                key={`collection-${index}`}
                                onClick={() => onCollectionAddressSelect(address.fullAddress)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    gap: 12,
                                    padding: 12,
                                    background: selectedCollectionAddress === address.fullAddress
                                        ? theme.colors.warn + '20'
                                        : theme.colors.panelAlt,
                                    border: `1px solid ${selectedCollectionAddress === address.fullAddress
                                        ? theme.colors.warn
                                        : theme.colors.border}`,
                                    borderRadius: theme.radii.md,
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseOver={(e) => {
                                    if (selectedCollectionAddress !== address.fullAddress) {
                                        e.currentTarget.style.background = theme.colors.muted;
                                    }
                                }}
                                onMouseOut={(e) => {
                                    if (selectedCollectionAddress !== address.fullAddress) {
                                        e.currentTarget.style.background = theme.colors.panelAlt;
                                    }
                                }}
                            >
                                {getAddressIcon(address.type)}
                                <div style={{ flex: 1 }}>
                                    <div style={{
                                        fontSize: 13,
                                        fontWeight: 600,
                                        color: theme.colors.text,
                                        marginBottom: 4
                                    }}>
                                        {address.label}
                                    </div>
                                    <div style={{
                                        fontSize: 12,
                                        color: theme.colors.textSubtle,
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {address.fullAddress}
                                    </div>
                                    <div style={{
                                        fontSize: 11,
                                        color: theme.colors.warn,
                                        marginTop: 4
                                    }}>
                                        Postcode: {address.postcode}
                                        {address.distance && ` • ${address.distance} miles from base`}
                                    </div>
                                </div>
                                {selectedCollectionAddress === address.fullAddress && (
                                    <CheckCircleIcon style={{
                                        width: 20,
                                        height: 20,
                                        color: theme.colors.success
                                    }} />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Custom Address Entry */}
            {!showCustomEntry ? (
                <button
                    onClick={() => setShowCustomEntry(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 16px',
                        background: theme.colors.accent,
                        color: 'white',
                        border: 'none',
                        borderRadius: theme.radii.md,
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                        transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = theme.colors.accentAlt;
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = theme.colors.accent;
                    }}
                >
                    <PlusCircleIcon style={{ width: 18, height: 18 }} />
                    Enter Custom Address
                </button>
            ) : (
                <div style={{
                    background: theme.colors.panelAlt,
                    borderRadius: theme.radii.md,
                    padding: 16,
                    border: `1px solid ${theme.colors.border}`
                }}>
                    <h4 style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: theme.colors.text,
                        marginBottom: 12
                    }}>
                        Enter Custom Address
                    </h4>

                    <div style={{ marginBottom: 12 }}>
                        <label style={{
                            fontSize: 13,
                            color: theme.colors.textSubtle,
                            display: 'block',
                            marginBottom: 4
                        }}>
                            Address Type
                        </label>
                        <select
                            value={customAddressType}
                            onChange={(e) => setCustomAddressType(e.target.value as 'site' | 'collection')}
                            style={{
                                width: '100%',
                                padding: '8px 12px',
                                background: theme.colors.panel,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.radii.sm,
                                color: theme.colors.text,
                                fontSize: 14
                            }}
                        >
                            <option value="site">Site/Installation Address</option>
                            <option value="collection">Collection Address</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: 12 }}>
                        <label style={{
                            fontSize: 13,
                            color: theme.colors.textSubtle,
                            display: 'block',
                            marginBottom: 4
                        }}>
                            Full Address (paste or type)
                        </label>
                        <textarea
                            value={customAddressText}
                            onChange={(e) => {
                                setCustomAddressText(e.target.value);
                                setValidationError(null);
                            }}
                            placeholder={exampleFormat}
                            style={{
                                width: '100%',
                                minHeight: 120,
                                padding: '8px 12px',
                                background: theme.colors.panel,
                                border: `1px solid ${validationError ? theme.colors.danger : theme.colors.border}`,
                                borderRadius: theme.radii.sm,
                                color: theme.colors.text,
                                fontSize: 13,
                                fontFamily: 'monospace',
                                resize: 'vertical'
                            }}
                        />
                        {validationError && (
                            <div style={{
                                fontSize: 12,
                                color: theme.colors.danger,
                                marginTop: 4
                            }}>
                                ⚠️ {validationError}
                            </div>
                        )}
                    </div>

                    <div style={{
                        background: theme.colors.accentAlt + '10',
                        border: `1px solid ${theme.colors.accentAlt}40`,
                        borderRadius: theme.radii.sm,
                        padding: 8,
                        marginBottom: 12
                    }}>
                        <p style={{
                            fontSize: 12,
                            color: theme.colors.accentAlt,
                            margin: 0
                        }}>
                            💡 Address must include a valid UK postcode on the last line
                        </p>
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            onClick={handleCustomAddressSubmit}
                            style={{
                                flex: 1,
                                padding: '8px 16px',
                                background: theme.colors.success,
                                color: 'white',
                                border: 'none',
                                borderRadius: theme.radii.sm,
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 500
                            }}
                        >
                            Add Address
                        </button>
                        <button
                            onClick={() => {
                                setShowCustomEntry(false);
                                setCustomAddressText('');
                                setValidationError(null);
                            }}
                            style={{
                                padding: '8px 16px',
                                background: theme.colors.muted,
                                color: theme.colors.text,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.radii.sm,
                                cursor: 'pointer',
                                fontSize: 14,
                                fontWeight: 500
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper function to extract multiple addresses from quote text
export const extractAddressesFromQuote = (text: string, clientName?: string): Address[] => {
    const addresses: Address[] = [];
    const postcodeRegex = /\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/gi;

    // Split text into sections that might contain addresses
    const lines = text.split('\n');
    let currentAddress: string[] = [];
    let currentType: Address['type'] = 'custom';
    let currentLabel = '';

    lines.forEach((line, index) => {
        const lowerLine = line.toLowerCase();

        // Check for address markers
        if (lowerLine.includes('site:') || lowerLine.includes('installation at:') || lowerLine.includes('install at:')) {
            currentType = 'site';
            currentLabel = 'Installation Site';
        } else if (lowerLine.includes('collection:') || lowerLine.includes('collect from:') || lowerLine.includes('warehouse:')) {
            currentType = 'collection';
            currentLabel = 'Collection Point';
        } else if (lowerLine.includes('client:') || lowerLine.includes('customer:') || lowerLine.includes('invoice to:')) {
            currentType = 'client';
            currentLabel = clientName || 'Client Address';
        }

        // Check if line contains a postcode
        const postcodeMatch = line.match(postcodeRegex);
        if (postcodeMatch) {
            // We found a postcode, compile the address
            currentAddress.push(line);

            // Look back to get previous lines that might be part of the address
            for (let i = index - 1; i >= 0 && i > index - 5; i--) {
                const prevLine = lines[i].trim();
                if (prevLine && !prevLine.toLowerCase().includes('product') && !prevLine.toLowerCase().includes('quantity')) {
                    currentAddress.unshift(prevLine);
                } else {
                    break;
                }
            }

            // Create the address object
            const fullAddress = currentAddress.join('\n');
            addresses.push({
                type: currentType,
                label: currentLabel || `Address ${addresses.length + 1}`,
                fullAddress,
                postcode: postcodeMatch[0].toUpperCase(),
                isValid: true
            });

            // Reset for next address
            currentAddress = [];
            currentType = 'custom';
            currentLabel = '';
        }
    });

    return addresses;
};