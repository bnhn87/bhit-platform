import React, { useState, useEffect } from 'react';
import { theme } from '../../../lib/theme';
import { MapPinIcon, BuildingOfficeIcon, TruckIcon, PlusCircleIcon, CheckCircleIcon, ClockIcon } from './icons';
import { clientService, type ClientAddress, type Client } from '../services/clientService';

export interface Address {
    type: 'site' | 'collection' | 'client' | 'custom';
    label: string;
    fullAddress: string;
    postcode: string;
    distance?: number; // Miles from base
    isValid: boolean;
    dbId?: string; // Database ID if from saved addresses
    accessRestrictions?: string;
    hasLoadingBay?: boolean;
}

interface AddressSelectorProps {
    detectedAddresses: Address[];
    selectedSiteAddress: string;
    selectedCollectionAddress?: string;
    onSiteAddressSelect: (address: string) => void;
    onCollectionAddressSelect?: (address: string) => void;
    clientName?: string;
    clientEmail?: string;
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

// Convert database address to our Address type
const dbAddressToAddress = (dbAddr: ClientAddress, client?: Client): Address => {
    const addressLines = [
        dbAddr.address_line1,
        dbAddr.address_line2,
        dbAddr.city,
        dbAddr.postcode
    ].filter(Boolean).join('\n');

    return {
        type: dbAddr.address_type === 'site' || dbAddr.address_type === 'warehouse' || dbAddr.address_type === 'collection'
            ? (dbAddr.address_type === 'warehouse' ? 'collection' : dbAddr.address_type as 'site' | 'collection')
            : 'client',
        label: dbAddr.label || `${client?.company_name || client?.name || 'Client'} - ${dbAddr.label}`,
        fullAddress: addressLines,
        postcode: dbAddr.postcode,
        distance: dbAddr.distance_from_base_miles || undefined,
        isValid: true,
        dbId: dbAddr.id,
        accessRestrictions: dbAddr.access_restrictions || undefined,
        hasLoadingBay: dbAddr.has_loading_bay
    };
};

export const EnhancedAddressSelector: React.FC<AddressSelectorProps> = ({
    detectedAddresses,
    selectedSiteAddress,
    selectedCollectionAddress,
    onSiteAddressSelect,
    onCollectionAddressSelect,
    clientName,
    clientEmail
}) => {
    const [showCustomEntry, setShowCustomEntry] = useState(false);
    const [customAddressText, setCustomAddressText] = useState('');
    const [customAddressType, setCustomAddressType] = useState<'site' | 'collection'>('site');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
    const [recentAddresses, setRecentAddresses] = useState<Address[]>([]);
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [currentClient, setCurrentClient] = useState<Client | null>(null);
    const [showSavedTab, setShowSavedTab] = useState(false);

    // Load client and their addresses when component mounts or client info changes
    useEffect(() => {
        const loadClientData = async () => {
            if (!clientEmail && !clientName) return;

            setLoadingAddresses(true);
            try {
                // Search for client
                let client: Client | null = null;
                if (clientEmail) {
                    client = await clientService.searchClient(clientEmail);
                }
                if (!client && clientName) {
                    client = await clientService.searchClient(clientName);
                }

                if (client) {
                    setCurrentClient(client);

                    // Get client's addresses
                    const addresses = await clientService.getClientAddresses(client.id);
                    const convertedAddresses = addresses.map(addr => dbAddressToAddress(addr, client));
                    setSavedAddresses(convertedAddresses);

                    // If we have saved addresses but no detected ones, show saved tab
                    if (convertedAddresses.length > 0 && detectedAddresses.length === 0) {
                        setShowSavedTab(true);
                    }
                }

                // Get recent addresses from all clients
                const recent = await clientService.getRecentAddresses(5);
                const convertedRecent = recent.map(addr => dbAddressToAddress(addr));
                setRecentAddresses(convertedRecent);

            } catch (error) {
                console.error('Error loading client data:', error);
            } finally {
                setLoadingAddresses(false);
            }
        };

        loadClientData();
    }, [clientEmail, clientName]);

    const handleCustomAddressSubmit = async () => {
        const validation = validateUKAddressFormat(customAddressText);

        if (!validation.isValid || !validation.postcode) {
            setValidationError('Invalid address format. Please ensure you include a valid UK postcode on the last line.');
            return;
        }

        // Parse the address to structured format
        const parsedAddress = clientService.parseAddressString(validation.formatted);

        // Save to database if we have a client
        if (currentClient && parsedAddress.address_line1) {
            try {
                const newAddress = await clientService.addClientAddress(currentClient.id, {
                    address_type: customAddressType === 'site' ? 'site' : 'warehouse',
                    label: `${customAddressType === 'site' ? 'Site' : 'Collection'} - ${new Date().toLocaleDateString()}`,
                    address_line1: parsedAddress.address_line1,
                    address_line2: parsedAddress.address_line2 || '',
                    city: parsedAddress.city || '',
                    postcode: parsedAddress.postcode || '',
                    country: 'GB'
                });

                if (newAddress) {
                    // Add to saved addresses
                    const converted = dbAddressToAddress(newAddress, currentClient);
                    setSavedAddresses([...savedAddresses, converted]);
                }
            } catch (error) {
                console.error('Error saving address:', error);
            }
        }

        // Add to appropriate field
        if (customAddressType === 'site') {
            onSiteAddressSelect(validation.formatted);
        } else if (onCollectionAddressSelect) {
            onCollectionAddressSelect(validation.formatted);
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

    const renderAddressButton = (
        address: Address,
        isSelected: boolean,
        onClick: () => void,
        colorTheme: 'accent' | 'warn' = 'accent'
    ) => {
        const themeColor = colorTheme === 'warn' ? theme.colors.warn : theme.colors.accent;

        return (
            <button
                onClick={onClick}
                style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    padding: 12,
                    background: isSelected
                        ? themeColor + '20'
                        : theme.colors.panelAlt,
                    border: `1px solid ${isSelected
                        ? themeColor
                        : theme.colors.border}`,
                    borderRadius: theme.radii.md,
                    cursor: 'pointer',
                    textAlign: 'left',
                    width: '100%',
                    transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                    if (!isSelected) {
                        e.currentTarget.style.background = theme.colors.muted;
                    }
                }}
                onMouseOut={(e) => {
                    if (!isSelected) {
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
                        color: themeColor,
                        marginTop: 4
                    }}>
                        Postcode: {address.postcode}
                        {address.distance && ` • ${address.distance} miles from base`}
                        {address.hasLoadingBay && ' • Loading bay'}
                    </div>
                    {address.accessRestrictions && (
                        <div style={{
                            fontSize: 11,
                            color: theme.colors.warn,
                            marginTop: 2,
                            fontStyle: 'italic'
                        }}>
                            ⚠️ {address.accessRestrictions}
                        </div>
                    )}
                </div>
                {isSelected && (
                    <CheckCircleIcon style={{
                        width: 20,
                        height: 20,
                        color: theme.colors.success
                    }} />
                )}
            </button>
        );
    };

    const exampleFormat = `Example format:
Rawside Furniture Ltd
Unit 5, The Leather Market
Weston Street
London
SE1 3ER`;

    const allAddresses = [...detectedAddresses, ...savedAddresses];
    const hasContent = allAddresses.length > 0 || showCustomEntry || recentAddresses.length > 0;

    if (!hasContent) {
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

            {/* Tabs for detected vs saved addresses */}
            {(detectedAddresses.length > 0 || savedAddresses.length > 0) && (
                <div style={{
                    display: 'flex',
                    gap: 8,
                    marginBottom: 16,
                    borderBottom: `1px solid ${theme.colors.border}`,
                    paddingBottom: 8
                }}>
                    {detectedAddresses.length > 0 && (
                        <button
                            onClick={() => setShowSavedTab(false)}
                            style={{
                                padding: '6px 12px',
                                background: !showSavedTab ? theme.colors.accent : 'transparent',
                                color: !showSavedTab ? 'white' : theme.colors.text,
                                border: 'none',
                                borderRadius: theme.radii.sm,
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: 500
                            }}
                        >
                            Detected ({detectedAddresses.length})
                        </button>
                    )}
                    {savedAddresses.length > 0 && (
                        <button
                            onClick={() => setShowSavedTab(true)}
                            style={{
                                padding: '6px 12px',
                                background: showSavedTab ? theme.colors.accent : 'transparent',
                                color: showSavedTab ? 'white' : theme.colors.text,
                                border: 'none',
                                borderRadius: theme.radii.sm,
                                cursor: 'pointer',
                                fontSize: 13,
                                fontWeight: 500
                            }}
                        >
                            Saved ({savedAddresses.length})
                        </button>
                    )}
                    {recentAddresses.length > 0 && (
                        <button
                            style={{
                                marginLeft: 'auto',
                                padding: '6px 12px',
                                background: theme.colors.accentAlt + '20',
                                color: theme.colors.accentAlt,
                                border: `1px solid ${theme.colors.accentAlt}40`,
                                borderRadius: theme.radii.sm,
                                cursor: 'pointer',
                                fontSize: 12,
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4
                            }}
                        >
                            <ClockIcon style={{ width: 14, height: 14 }} />
                            Recent ({recentAddresses.length})
                        </button>
                    )}
                </div>
            )}

            {loadingAddresses && (
                <div style={{
                    padding: 20,
                    textAlign: 'center',
                    color: theme.colors.textSubtle,
                    fontSize: 14
                }}>
                    Loading saved addresses...
                </div>
            )}

            {!loadingAddresses && !showSavedTab && detectedAddresses.length > 0 && (
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

            {/* Display addresses based on selected tab */}
            {!loadingAddresses && (
                <>
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
                            {(showSavedTab ? savedAddresses : detectedAddresses)
                                .filter(addr => addr.type === 'site' || addr.type === 'custom')
                                .map((address, index) => (
                                    <React.Fragment key={`site-${showSavedTab ? 'saved' : 'detected'}-${index}`}>
                                        {renderAddressButton(
                                            address,
                                            selectedSiteAddress === address.fullAddress,
                                            () => onSiteAddressSelect(address.fullAddress),
                                            'accent'
                                        )}
                                    </React.Fragment>
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
                                {(showSavedTab ? savedAddresses : detectedAddresses)
                                    .filter(addr => addr.type === 'collection' || addr.type === 'client')
                                    .map((address, index) => (
                                        <React.Fragment key={`collection-${showSavedTab ? 'saved' : 'detected'}-${index}`}>
                                            {renderAddressButton(
                                                address,
                                                selectedCollectionAddress === address.fullAddress,
                                                () => onCollectionAddressSelect(address.fullAddress),
                                                'warn'
                                            )}
                                        </React.Fragment>
                                    ))}
                            </div>
                        </div>
                    )}
                </>
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
                            {currentClient && ' • This address will be saved to the client record'}
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

            {/* Show logistics calculation if we have both addresses */}
            {selectedSiteAddress && selectedCollectionAddress && (
                <div style={{
                    background: theme.colors.success + '10',
                    border: `1px solid ${theme.colors.success}40`,
                    borderRadius: theme.radii.md,
                    padding: 12,
                    marginTop: 16
                }}>
                    <p style={{
                        fontSize: 13,
                        color: theme.colors.success,
                        margin: 0,
                        fontWeight: 500
                    }}>
                        ✅ Route: Base → Collection → Site → Base
                    </p>
                    <p style={{
                        fontSize: 12,
                        color: theme.colors.text,
                        margin: '4px 0 0 0'
                    }}>
                        Distance calculation will be included in the quote
                    </p>
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