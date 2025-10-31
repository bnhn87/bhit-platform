
import React, { useState, useMemo, useEffect } from 'react';

import { getGlassmorphicStyle } from '../../components/ui/GlassmorphicStyles';
import { theme } from '../../lib/theme';


import { ListBulletIcon, PlusCircleIcon, BookOpenIcon, PencilIcon as _PencilIcon, TrashIcon } from './components/icons';
import { QuoteDetailsForm } from './components/QuoteDetailsForm';
import { ProductReference, CalculatedProduct, QuoteDetails, AppConfig } from './types';
import { getDashboardCardStyle as _getDashboardCardStyle, getDashboardButtonStyle as _getDashboardButtonStyle, getDashboardTypographyStyle as _getDashboardTypographyStyle, getDashboardInputStyle as _getDashboardInputStyle, spacing as _spacing } from './utils/dashboardStyles';


interface ManualProductSelectorProps {
    config: AppConfig;
    onSubmit: (products: CalculatedProduct[], details: QuoteDetails) => void;
}

interface SelectedProduct {
    productCode: string;
    description: string;
    quantity: number;
}

export const ManualProductSelector: React.FC<ManualProductSelectorProps> = ({ config, onSubmit }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [selectedProducts, setSelectedProducts] = useState<Record<string, SelectedProduct>>({});
    const [showDropdown, setShowDropdown] = useState(false);
    const [showFullCatalogue, setShowFullCatalogue] = useState(false);
    const [_editingProduct, _setEditingProduct] = useState<string | null>(null);
    const [batchMode, setBatchMode] = useState(false);
    const [batchText, setBatchText] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newProductCode, setNewProductCode] = useState('');
    const [newProductTime, setNewProductTime] = useState('0.5');
    const [newProductWaste, setNewProductWaste] = useState(String(config.rules.defaultWasteVolumeM3));
    const [newProductHeavy, setNewProductHeavy] = useState(false);
    const [quoteDetails, setQuoteDetails] = useState<QuoteDetails>({
        quoteRef: '',
        client: '',
        project: 'Manual Entry Project',
        deliveryAddress: '',
        preparedBy: config.rules.preparedByOptions[0],
        upliftViaStairs: false,
        extendedUplift: false,
        specialistReworking: false,
        manuallyAddSupervisor: false,
        overrideWasteVolumeM3: null,
        overrideFitterCount: null,
        overrideSupervisorCount: null,
        overrideVanType: null,
    });

    // Debounce search term to reduce re-renders
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            if (showDropdown) {
                setShowDropdown(false);
            }
        };

        if (showDropdown) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [showDropdown]);

    const productList = useMemo(() => {
        return Object.entries(config.productCatalogue).map(([code, ref]) => ({
            code,
            description: `Install: ${ref.installTimeHours.toFixed(2)}h, Waste: ${ref.wasteVolumeM3}m³, Heavy: ${ref.isHeavy ? 'Yes' : 'No'}`
        })).sort((a,b) => a.code.localeCompare(b.code));
    }, [config.productCatalogue]);

    const filteredProducts = useMemo(() => {
        if (!debouncedSearchTerm) {
            // For admin-style dropdown, return Object.entries
            return Object.entries(config.productCatalogue)
                .filter(([code]) => code.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
                .sort(([a], [b]) => a.localeCompare(b));
        }
        // For search, return the product list format
        const lowerSearch = debouncedSearchTerm.toLowerCase();
        return productList.filter(p => p.code.toLowerCase().includes(lowerSearch) || p.description.toLowerCase().includes(lowerSearch));
    }, [debouncedSearchTerm, productList, config.productCatalogue]);

    const addProduct = (code: string) => {
        if(selectedProducts[code]) {
            // If product already exists, just increment quantity
            handleQuantityChange(code, selectedProducts[code].quantity + 1);
        } else {
            setSelectedProducts(prev => ({
                ...prev,
                [code]: {
                    productCode: code,
                    description: code, // Use the product code for a better description
                    quantity: 1
                }
            }));
        }
        setShowDropdown(false);
    };

    // Parse batch entry text like "PROD-001 x5, DESK-002 x3, CHAIR-100 x10"
    const parseBatchEntry = (text: string): { code: string; quantity: number }[] => {
        const results: { code: string; quantity: number }[] = [];

        // Split by comma, semicolon, or newline
        const lines = text.split(/[,;\n]+/).map(l => l.trim()).filter(l => l.length > 0);

        for (const line of lines) {
            // Match patterns like: PROD-001 x5, PROD-001 *5, PROD-001 5, or just PROD-001
            const match = line.match(/^([A-Z0-9\-_]+)\s*[x*×]?\s*(\d+)?$/i);

            if (match) {
                const code = match[1].toUpperCase();
                const quantity = match[2] ? parseInt(match[2], 10) : 1;

                if (config.productCatalogue[code]) {
                    results.push({ code, quantity });
                } else {
                    console.warn(`Product code not found in catalogue: ${code}`);
                }
            }
        }

        return results;
    };

    const handleBatchSubmit = () => {
        const parsed = parseBatchEntry(batchText);

        if (parsed.length === 0) {
            alert('No valid products found. Use format: PROD-001 x5, DESK-002 x3');
            return;
        }

        // Add all parsed products
        const updated = { ...selectedProducts };
        for (const item of parsed) {
            if (updated[item.code]) {
                // Increment existing quantity
                updated[item.code].quantity += item.quantity;
            } else {
                updated[item.code] = {
                    productCode: item.code,
                    description: item.code,
                    quantity: item.quantity
                };
            }
        }

        setSelectedProducts(updated);
        setBatchText('');
        alert(`✓ Added ${parsed.length} product(s) from batch entry`);
    };

    const handleAddNewProduct = () => {
        setShowAddModal(true);
    };

    const handleModalSubmit = () => {
        const trimmedCode = newProductCode.trim().toUpperCase();

        if (!trimmedCode) {
            alert('Product code is required');
            return;
        }

        if (config.productCatalogue[trimmedCode]) {
            alert('A product with this code already exists.');
            return;
        }

        const newProduct: ProductReference = {
            installTimeHours: parseFloat(newProductTime) || 0.5,
            wasteVolumeM3: parseFloat(newProductWaste) || config.rules.defaultWasteVolumeM3,
            isHeavy: newProductHeavy
        };

        // In a real application, this would update the global config
        // For now, we'll just add it locally (this won't persist)
        config.productCatalogue[trimmedCode] = newProduct;
        addProduct(trimmedCode);

        // Reset modal
        setShowAddModal(false);
        setNewProductCode('');
        setNewProductTime('0.5');
        setNewProductWaste(String(config.rules.defaultWasteVolumeM3));
        setNewProductHeavy(false);
    };

    const catalogueProducts = useMemo(() => {
        return Object.entries(config.productCatalogue)
            .filter(([code]) => code.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort(([a], [b]) => a.localeCompare(b));
    }, [searchTerm, config.productCatalogue]);

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        setShowDropdown(value.length > 0);
    };

    const handleSelectProduct = (code: string) => {
        addProduct(code);
        setSearchTerm('');
        setShowDropdown(false);
    };
    
    const removeProduct = (code: string) => {
        setSelectedProducts(prev => {
            const newState = {...prev};
            delete newState[code];
            return newState;
        })
    }

    const handleQuantityChange = (code: string, quantity: number) => {
        const newQty = Math.max(1, quantity); // Ensure quantity is at least 1
        setSelectedProducts(prev => ({
            ...prev,
            [code]: { ...prev[code], quantity: newQty }
        }));
    };
    
    const handleSubmit = () => {
        if(Object.keys(selectedProducts).length === 0) {
            alert("Please add at least one product to the quote.");
            return;
        }

        const calculatedProducts: CalculatedProduct[] = Object.values(selectedProducts).map((p, index) => {
             const ref = config.productCatalogue[p.productCode] || { installTimeHours: 0, wasteVolumeM3: config.rules.defaultWasteVolumeM3, isHeavy: false };
             const timePerUnit = ref.installTimeHours;
             const wastePerUnit = ref.wasteVolumeM3;

             return {
                 lineNumber: index + 1,
                 productCode: p.productCode,
                 rawDescription: `Manually added: ${p.productCode}`,
                 cleanDescription: p.productCode,
                 description: p.description,
                 quantity: p.quantity,
                 timePerUnit,
                 totalTime: p.quantity * timePerUnit,
                 wastePerUnit,
                 totalWaste: p.quantity * wastePerUnit,
                 isHeavy: ref.isHeavy,
                 source: 'user-inputted',
             }
        });
        
        onSubmit(calculatedProducts, quoteDetails);
    }

    return (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 32 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                 <div style={{
                    background: theme.colors.panel,
                    padding: 24,
                    borderRadius: theme.radii.lg,
                    boxShadow: theme.shadow,
                    border: `1px solid ${theme.colors.border}`
                 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 600, color: theme.colors.text, display: "flex", alignItems: "center", margin: 0 }}>
                        <ListBulletIcon style={{ height: 24, width: 24, marginRight: 12, color: theme.colors.accent }}/>
                        Manual Quote Entry
                    </h2>
                    <p style={{ color: theme.colors.textSubtle, margin: 0, marginTop: 4 }}>Select products from the list to build your quote.</p>
                 </div>
                 <QuoteDetailsForm details={quoteDetails} onDetailsChange={setQuoteDetails} config={config} />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div style={{
                    background: theme.colors.panel,
                    padding: 32,
                    borderRadius: theme.radii.lg,
                    boxShadow: theme.shadow,
                    border: `1px solid ${theme.colors.border}`,
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <h3 style={{
                        fontSize: 22,
                        fontWeight: 700,
                        color: theme.colors.text,
                        margin: 0,
                        marginBottom: 8
                    }}>Product Catalogue</h3>
                    <p style={{
                        fontSize: 15,
                        color: theme.colors.textSubtle,
                        margin: 0,
                        marginBottom: 24
                    }}>Search and select products for your quote, or add new products on the fly.</p>

                    {/* Batch Mode Toggle */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <button
                            onClick={() => setBatchMode(false)}
                            style={{
                                padding: '8px 16px',
                                fontSize: 13,
                                fontWeight: 500,
                                border: `2px solid ${!batchMode ? theme.colors.accent : theme.colors.border}`,
                                borderRadius: theme.radii.md,
                                background: !batchMode ? `${theme.colors.accent}20` : 'transparent',
                                color: !batchMode ? theme.colors.accent : theme.colors.text,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Search Mode
                        </button>
                        <button
                            onClick={() => setBatchMode(true)}
                            style={{
                                padding: '8px 16px',
                                fontSize: 13,
                                fontWeight: 500,
                                border: `2px solid ${batchMode ? theme.colors.accent : theme.colors.border}`,
                                borderRadius: theme.radii.md,
                                background: batchMode ? `${theme.colors.accent}20` : 'transparent',
                                color: batchMode ? theme.colors.accent : theme.colors.text,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            Batch Entry Mode
                        </button>
                    </div>

                    {batchMode ? (
                        /* Batch Entry Mode */
                        <div style={{ marginBottom: 16, minHeight: 200 }}>
                            <textarea
                                placeholder="Enter products (one per line or comma-separated):&#10;PROD-001 x5&#10;DESK-002 x3&#10;CHAIR-100 x10"
                                value={batchText}
                                onChange={(e) => setBatchText(e.target.value)}
                                rows={6}
                                style={{
                                    width: '100%',
                                    padding: 12,
                                    fontSize: 14,
                                    fontFamily: 'monospace',
                                    border: `1px solid ${theme.colors.border}`,
                                    borderRadius: theme.radii.md,
                                    background: theme.colors.background,
                                    color: theme.colors.text,
                                    resize: 'vertical',
                                    outline: 'none'
                                }}
                                onFocus={(e) => {
                                    e.currentTarget.style.borderColor = theme.colors.accent;
                                    e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.accent}20`;
                                }}
                                onBlur={(e) => {
                                    e.currentTarget.style.borderColor = theme.colors.border;
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            />
                            <button
                                onClick={handleBatchSubmit}
                                disabled={!batchText.trim()}
                                style={{
                                    width: '100%',
                                    marginTop: 8,
                                    padding: '12px 20px',
                                    fontSize: 15,
                                    fontWeight: 600,
                                    color: 'white',
                                    background: batchText.trim() ? theme.colors.accent : '#666',
                                    borderRadius: theme.radii.md,
                                    border: 'none',
                                    cursor: batchText.trim() ? 'pointer' : 'not-allowed',
                                    transition: 'all 0.2s ease',
                                    opacity: batchText.trim() ? 1 : 0.5
                                }}
                            >
                                Add Products from Batch
                            </button>
                        </div>
                    ) : (
                    <div style={{ display: "flex", gap: 12, marginBottom: 16, minHeight: 200 }}>
                        <div
                            style={{ position: "relative", flex: 1, zIndex: 10 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <input
                                type="text"
                                placeholder="Search by product code..."
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="glassmorphic-base glassmorphic-dropdown"
                                style={{
                                    ...getGlassmorphicStyle('dropdown'),
                                    display: "block",
                                    width: "100%",
                                    padding: "12px 16px",
                                    fontSize: 15,
                                    fontWeight: 500,
                                    outline: 'none'
                                }}
                                onFocus={(e) => {
                                    setShowDropdown(searchTerm.length > 0);
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
                            />
                            {showDropdown && searchTerm && Array.isArray(filteredProducts) && filteredProducts.length > 0 && (
                                <div
                                    className="glassmorphic-base glassmorphic-panel"
                                    onMouseDown={(e) => e.preventDefault()}
                                    style={{
                                        ...getGlassmorphicStyle('panel'),
                                        position: "absolute",
                                        top: "100%",
                                        left: 0,
                                        right: 0,
                                        borderRadius: theme.radii.md,
                                        maxHeight: 200,
                                        overflowY: "auto",
                                        zIndex: 1000,
                                        marginTop: 4,
                                        padding: 8
                                    }}>
                                    {filteredProducts.map((item) => {
                                        // Handle both formats: product list and catalogue entries
                                        const code = typeof item === 'object' && 'code' in item ? item.code : item[0];
                                        const product = typeof item === 'object' && 'code' in item ? config.productCatalogue[item.code] : item[1];

                                        return (
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
                                        );
                                    })}
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
                            <button onClick={handleAddNewProduct} style={{
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
                    )}

                    {showFullCatalogue && (
                        <div style={{
                            background: theme.colors.panelAlt,
                            border: `1px solid ${theme.colors.border}`,
                            borderRadius: theme.radii.lg,
                            padding: 24,
                            marginTop: 16
                        }}>
                            <h4 style={{ fontSize: 16, fontWeight: 600, color: theme.colors.text, margin: 0, marginBottom: 16 }}>Full Product Catalogue</h4>
                            <div style={{ maxHeight: 300, overflowY: 'auto', border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.md }}>
                                {catalogueProducts.map(([code, product]) => (
                                    <div key={code} style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "12px 16px",
                                        borderBottom: `1px solid ${theme.colors.border}`,
                                        transition: "background 0.2s ease"
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = theme.colors.muted}
                                    onMouseOut={(e) => e.currentTarget.style.background = "transparent"}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 500, color: theme.colors.text }}>{code}</div>
                                            <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
                                                Install: {product.installTimeHours.toFixed(2)}h • Waste: {product.wasteVolumeM3}m³ • Weight: {product.isHeavy ? 'Heavy' : 'Light'}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => addProduct(code)}
                                            style={{
                                                padding: "6px 12px",
                                                background: theme.colors.accent,
                                                border: "none",
                                                borderRadius: theme.radii.sm,
                                                color: "white",
                                                cursor: "pointer",
                                                fontSize: 12,
                                                fontWeight: 500,
                                                transition: "all 0.2s ease"
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = "#2563eb"}
                                            onMouseOut={(e) => e.currentTarget.style.background = theme.colors.accent}
                                        >
                                            Add to Quote
                                        </button>
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
                        border: `1px solid ${theme.colors.border}`,
                        marginTop: 16
                    }}>
                        {Object.keys(config.productCatalogue).length} products in catalogue • 
                        {Object.keys(selectedProducts).length} products selected
                    </div>
                </div>

                 <div style={{
                    background: theme.colors.panel,
                    padding: 24,
                    borderRadius: theme.radii.lg,
                    boxShadow: theme.shadow,
                    border: `1px solid ${theme.colors.border}`
                 }}>
                     <h3 style={{ fontWeight: 600, fontSize: 18, color: theme.colors.text, margin: 0, marginBottom: 16 }}>Current Quote Items</h3>
                     {Object.keys(selectedProducts).length === 0 ? (
                         <p style={{ color: theme.colors.textSubtle, margin: 0, textAlign: "center", padding: "16px 0" }}>No products added yet.</p>
                     ) : (
                         <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, maxHeight: 240, overflowY: "auto" }}>
                            {Object.values(selectedProducts).map(p => (
                                <div key={p.productCode} style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    padding: 8,
                                    border: `1px solid ${theme.colors.border}`,
                                    borderRadius: theme.radii.md,
                                    background: theme.colors.panelAlt
                                }}>
                                    <p style={{ fontWeight: 500, flex: 1, margin: 0, color: theme.colors.text }}>{p.productCode}</p>
                                    <input type="number" value={p.quantity} onChange={e => handleQuantityChange(p.productCode, parseInt(e.target.value, 10))} style={{
                                        width: 80,
                                        textAlign: "center",
                                        margin: "0 16px",
                                        padding: "8px 12px",
                                        background: theme.colors.panel,
                                        border: `2px solid ${theme.colors.border}`,
                                        borderRadius: theme.radii.sm,
                                        color: theme.colors.text,
                                        fontSize: 14,
                                        fontWeight: 500,
                                        outline: 'none',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = theme.colors.accent;
                                        e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.accent}20`;
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = theme.colors.border;
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}/>
                                    <button onClick={() => removeProduct(p.productCode)} style={{
                                        padding: "8px",
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
                                    }}>
                                        <TrashIcon style={{ height: 16, width: 16 }} />
                                    </button>
                                 </div>
                            ))}
                         </div>
                     )}
                </div>
                 <button onClick={handleSubmit} style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "12px 24px",
                    border: "none",
                    fontSize: 16,
                    fontWeight: 500,
                    borderRadius: theme.radii.md,
                    background: theme.colors.accentAlt,
                    color: "white",
                    cursor: "pointer",
                    transition: "background 0.2s ease"
                 }}
                 onMouseOver={(e) => e.currentTarget.style.background = "#16a34a"}
                 onMouseOut={(e) => e.currentTarget.style.background = theme.colors.accentAlt}>
                    Calculate Quote
                </button>
            </div>

            {/* Add Product Modal */}
            {showAddModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 20
                }} onClick={() => setShowAddModal(false)}>
                    <div style={{
                        background: theme.colors.panel,
                        borderRadius: theme.radii.xl,
                        padding: 32,
                        maxWidth: 500,
                        width: '100%',
                        border: `1px solid ${theme.colors.border}`,
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ fontSize: 22, fontWeight: 700, color: theme.colors.text, margin: 0, marginBottom: 8 }}>
                            Add New Product
                        </h3>
                        <p style={{ fontSize: 14, color: theme.colors.textSubtle, margin: 0, marginBottom: 24 }}>
                            Create a new product and add it to the catalogue.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 500, color: theme.colors.text, display: 'block', marginBottom: 6 }}>
                                    Product Code *
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., DESK-001"
                                    value={newProductCode}
                                    onChange={(e) => setNewProductCode(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        fontSize: 14,
                                        border: `1px solid ${theme.colors.border}`,
                                        borderRadius: theme.radii.md,
                                        background: theme.colors.background,
                                        color: theme.colors.text,
                                        outline: 'none'
                                    }}
                                    onFocus={(e) => {
                                        e.currentTarget.style.borderColor = theme.colors.accent;
                                        e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.accent}20`;
                                    }}
                                    onBlur={(e) => {
                                        e.currentTarget.style.borderColor = theme.colors.border;
                                        e.currentTarget.style.boxShadow = 'none';
                                    }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: theme.colors.text, display: 'block', marginBottom: 6 }}>
                                        Install Time (hours)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        value={newProductTime}
                                        onChange={(e) => setNewProductTime(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            fontSize: 14,
                                            border: `1px solid ${theme.colors.border}`,
                                            borderRadius: theme.radii.md,
                                            background: theme.colors.background,
                                            color: theme.colors.text,
                                            outline: 'none'
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = theme.colors.accent;
                                            e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.accent}20`;
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = theme.colors.border;
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: 13, fontWeight: 500, color: theme.colors.text, display: 'block', marginBottom: 6 }}>
                                        Waste Volume (m³)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={newProductWaste}
                                        onChange={(e) => setNewProductWaste(e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 12px',
                                            fontSize: 14,
                                            border: `1px solid ${theme.colors.border}`,
                                            borderRadius: theme.radii.md,
                                            background: theme.colors.background,
                                            color: theme.colors.text,
                                            outline: 'none'
                                        }}
                                        onFocus={(e) => {
                                            e.currentTarget.style.borderColor = theme.colors.accent;
                                            e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.accent}20`;
                                        }}
                                        onBlur={(e) => {
                                            e.currentTarget.style.borderColor = theme.colors.border;
                                            e.currentTarget.style.boxShadow = 'none';
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: theme.colors.text,
                                    cursor: 'pointer'
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={newProductHeavy}
                                        onChange={(e) => setNewProductHeavy(e.target.checked)}
                                        style={{ cursor: 'pointer', width: 16, height: 16 }}
                                    />
                                    Heavy Item (requires extra handling)
                                </label>
                            </div>

                            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                                <button
                                    onClick={() => {
                                        setShowAddModal(false);
                                        setNewProductCode('');
                                        setNewProductTime('0.5');
                                        setNewProductWaste(String(config.rules.defaultWasteVolumeM3));
                                        setNewProductHeavy(false);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '12px 20px',
                                        fontSize: 15,
                                        fontWeight: 500,
                                        color: theme.colors.text,
                                        background: 'transparent',
                                        border: `1px solid ${theme.colors.border}`,
                                        borderRadius: theme.radii.md,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = theme.colors.panelAlt}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleModalSubmit}
                                    style={{
                                        flex: 1,
                                        padding: '12px 20px',
                                        fontSize: 15,
                                        fontWeight: 600,
                                        color: 'white',
                                        background: theme.colors.accentAlt,
                                        border: 'none',
                                        borderRadius: theme.radii.md,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#16a34a'}
                                    onMouseOut={(e) => e.currentTarget.style.background = theme.colors.accentAlt}
                                >
                                    Add Product
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
