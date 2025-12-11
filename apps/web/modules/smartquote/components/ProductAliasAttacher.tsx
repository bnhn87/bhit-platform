import React, { useState, useEffect } from 'react';

import { theme } from '../../../lib/theme';
import { catalogueService } from '../services/catalogueService';
import { getDefaultConfig } from '../services/configService';

interface ProductAliasAttacherProps {
    productCode: string;
    productDescription?: string;
    onAttached?: (productId: string, canonicalName: string) => void;
    onSaveNew?: (installTimeHours: number, wasteVolumeM3: number) => void;
    defaultTime?: number;
    defaultWaste?: number;
}

interface CatalogueProduct {
    id: string;
    canonicalName: string;
    canonicalCode: string;
    installTimeHours: number;
    wasteVolumeM3: number;
    aliases?: string[];
}

export const ProductAliasAttacher: React.FC<ProductAliasAttacherProps> = ({
    productCode,
    productDescription,
    onAttached,
    onSaveNew,
    defaultTime = 0,
    defaultWaste = 0.035
}) => {
    const [mode, setMode] = useState<'initial' | 'attach' | 'new'>('initial');
    const [catalogueProducts, setCatalogueProducts] = useState<CatalogueProduct[]>([]);
    const [selectedProductId, setSelectedProductId] = useState<string>('');
    const [installTime, setInstallTime] = useState(defaultTime);
    const [wasteVolume, setWasteVolume] = useState(defaultWaste);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [saveTooltip, setSaveTooltip] = useState(false);
    const [catalogueLoading, setCatalogueLoading] = useState(true);

    useEffect(() => {
        loadCatalogueProducts();
    }, []);

    const loadCatalogueProducts = async () => {
        setCatalogueLoading(true);
        try {
            // Try to load from database first
            let products = await catalogueService.getAllProducts();

            // If no products from DB, use config as fallback
            if (!products || products.length === 0) {
                if (process.env.NODE_ENV === 'development') {
                }
                const config = await getDefaultConfig();

                // Convert config products to the expected format
                products = Object.entries(config.productCatalogue).map(([code, ref], index) => ({
                    id: `config-${index}`,
                    canonicalName: code,
                    canonicalCode: code,
                    installTimeHours: ref.installTimeHours,
                    wasteVolumeM3: ref.wasteVolumeM3,
                    aliases: []
                }));
            }

            setCatalogueProducts(products as CatalogueProduct[]);
        } catch (error: unknown) {
            console.error('Failed to load catalogue:', error);

            // Last resort fallback - use config directly
            try {
                const config = await getDefaultConfig();
                const fallbackProducts = Object.entries(config.productCatalogue).map(([code, ref], index) => ({
                    id: `config-${index}`,
                    canonicalName: code,
                    canonicalCode: code,
                    installTimeHours: ref.installTimeHours,
                    wasteVolumeM3: ref.wasteVolumeM3,
                    aliases: []
                }));
                setCatalogueProducts(fallbackProducts as CatalogueProduct[]);
            } catch (fallbackError) {
                console.error('Failed to load fallback catalogue:', fallbackError);
            }
        } finally {
            setCatalogueLoading(false);
        }
    };

    const filteredProducts = catalogueProducts.filter(p => {
        const term = searchTerm.toLowerCase();
        return p.canonicalName.toLowerCase().includes(term) ||
               p.canonicalCode.toLowerCase().includes(term) ||
               p.aliases?.some(a => a.toLowerCase().includes(term));
    });

    const handleAttachToExisting = async () => {
        if (!selectedProductId) {
            setMessage('Please select a product to attach to');
            return;
        }

        setLoading(true);
        try {
            const product = catalogueProducts.find(p => p.id === selectedProductId);

            // Check if this is a config product (not from database)
            if (selectedProductId.startsWith('config-')) {
                // For config products, we can't attach via database
                // Instead, we'll just use the product's time directly
                if (product && onAttached) {
                    onAttached(product.id, product.canonicalName);
                    // Also trigger the save with the product's times
                    if (onSaveNew) {
                        onSaveNew(product.installTimeHours, product.wasteVolumeM3);
                    }
                }
                setMessage(`✅ Using times from "${product?.canonicalName}": ${product?.installTimeHours}h`);

                // Auto-close after success
                setTimeout(() => {
                    setMode('initial');
                    setMessage('');
                }, 2000);
            } else {
                // Try database attachment for real database products
                const success = await catalogueService.attachAlias(productCode, selectedProductId);
                if (success) {
                    if (product && onAttached) {
                        onAttached(product.id, product.canonicalName);
                    }
                    setMessage(`✅ "${productCode}" attached to ${product?.canonicalName}`);

                    // Auto-close after success
                    setTimeout(() => {
                        setMode('initial');
                        setMessage('');
                    }, 2000);
                } else {
                    setMessage('Failed to attach alias - database may not be configured');
                }
            }
        } catch (error: unknown) {
            setMessage('Using config catalogue - select a product to use its times');
            console.error('Attach error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAsNew = async () => {
        setLoading(true);
        try {
            const productName = productDescription || productCode;
            const success = await catalogueService.saveProduct(
                productCode,
                productName,
                installTime,
                wasteVolume
            );

            if (success) {
                if (onSaveNew) {
                    onSaveNew(installTime, wasteVolume);
                }
                setMessage(`✅ Saved "${productCode}" to catalogue`);
                setSaveTooltip(true);

                // Reload catalogue
                await loadCatalogueProducts();

                // Auto-close after success
                setTimeout(() => {
                    setMode('initial');
                    setMessage('');
                    setSaveTooltip(false);
                }, 3000);
            } else {
                setMessage('Failed to save product');
            }
        } catch (error: unknown) {
            setMessage('Error saving product');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (mode === 'initial') {
        return (
            <div style={{
                background: theme.colors.panel,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radii.md,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div style={{ fontSize: '14px', color: theme.colors.text }}>
                    Product <span style={{ fontFamily: 'monospace', fontWeight: 600, color: theme.colors.accent }}>{productCode}</span> not in catalogue
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <label style={{ flex: 1, minWidth: '150px' }}>
                        <span style={{ fontSize: '12px', color: theme.colors.textSubtle }}>Install Time (hours)</span>
                        <input
                            type="number"
                            step="0.05"
                            value={installTime}
                            onChange={(e) => setInstallTime(parseFloat(e.target.value) || 0)}
                            style={{
                                marginTop: '4px',
                                display: 'block',
                                width: '100%',
                                padding: '8px',
                                background: theme.colors.panelAlt,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.radii.sm,
                                color: theme.colors.text,
                                fontSize: '14px'
                            }}
                            placeholder="e.g., 1.45"
                        />
                    </label>

                    <label style={{ flex: 1, minWidth: '150px' }}>
                        <span style={{ fontSize: '12px', color: theme.colors.textSubtle }}>Waste (m³)</span>
                        <input
                            type="number"
                            step="0.001"
                            value={wasteVolume}
                            onChange={(e) => setWasteVolume(parseFloat(e.target.value) || 0.035)}
                            style={{
                                marginTop: '4px',
                                display: 'block',
                                width: '100%',
                                padding: '8px',
                                background: theme.colors.panelAlt,
                                border: `1px solid ${theme.colors.border}`,
                                borderRadius: theme.radii.sm,
                                color: theme.colors.text,
                                fontSize: '14px'
                            }}
                            placeholder="e.g., 0.035"
                        />
                    </label>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setMode('attach')}
                        style={{
                            flex: 1,
                            background: theme.colors.accent,
                            color: 'white',
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: theme.radii.md,
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                        title="Link this code to an existing product in catalogue"
                    >
                        🔗 Attach to Existing Product
                    </button>

                    <button
                        onClick={handleSaveAsNew}
                        disabled={loading || installTime <= 0}
                        style={{
                            flex: 1,
                            background: loading || installTime <= 0 ? theme.colors.muted : theme.colors.success,
                            color: 'white',
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: theme.radii.md,
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: loading || installTime <= 0 ? 'not-allowed' : 'pointer',
                            opacity: loading || installTime <= 0 ? 0.5 : 1,
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            if (!loading && installTime > 0) e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseOut={(e) => {
                            if (!loading && installTime > 0) e.currentTarget.style.opacity = '1';
                        }}
                        title="Save as a new product in catalogue"
                    >
                        💾 Save to Catalogue
                    </button>
                </div>

                {saveTooltip && (
                    <div style={{
                        fontSize: '12px',
                        color: theme.colors.success,
                        background: `${theme.colors.success}15`,
                        padding: '8px 12px',
                        borderRadius: theme.radii.sm,
                        border: `1px solid ${theme.colors.success}30`
                    }}>
                        💡 Future quotes with &quot;{productCode}&quot; will now use {installTime} hours automatically
                    </div>
                )}

                {message && (
                    <div style={{
                        fontSize: '13px',
                        textAlign: 'center',
                        padding: '10px',
                        background: `${theme.colors.accent}15`,
                        color: theme.colors.accent,
                        borderRadius: theme.radii.sm,
                        border: `1px solid ${theme.colors.accent}30`
                    }}>
                        {message}
                    </div>
                )}
            </div>
        );
    }

    if (mode === 'attach') {
        return (
            <div style={{
                background: theme.colors.panel,
                border: `2px solid ${theme.colors.accent}`,
                borderRadius: theme.radii.md,
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: theme.colors.text }}>
                        Attach &quot;{productCode}&quot; to Existing Product
                    </h3>
                    <button
                        onClick={() => setMode('initial')}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: theme.colors.textSubtle,
                            fontSize: '20px',
                            cursor: 'pointer',
                            padding: '0 4px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.color = theme.colors.text}
                        onMouseOut={(e) => e.currentTarget.style.color = theme.colors.textSubtle}
                    >
                        ✕
                    </button>
                </div>

                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: theme.colors.panelAlt,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radii.sm,
                        color: theme.colors.text,
                        fontSize: '14px'
                    }}
                />

                {catalogueLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ color: theme.colors.textSubtle }}>Loading catalogue...</div>
                    </div>
                ) : catalogueProducts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div style={{ color: theme.colors.textSubtle }}>No products in catalogue</div>
                        <div style={{ fontSize: '12px', color: theme.colors.muted, marginTop: '4px' }}>
                            Save this product to start building your catalogue
                        </div>
                    </div>
                ) : (
                <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {filteredProducts.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '20px', color: theme.colors.textSubtle }}>
                            No products matching &quot;{searchTerm}&quot;
                        </div>
                    ) : filteredProducts.map(product => (
                        <label
                            key={product.id}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '10px',
                                background: selectedProductId === product.id ? `${theme.colors.accent}20` : theme.colors.panelAlt,
                                border: `1px solid ${selectedProductId === product.id ? theme.colors.accent : theme.colors.border}`,
                                borderRadius: theme.radii.sm,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                if (selectedProductId !== product.id) {
                                    e.currentTarget.style.background = `${theme.colors.accent}10`;
                                }
                            }}
                            onMouseOut={(e) => {
                                if (selectedProductId !== product.id) {
                                    e.currentTarget.style.background = theme.colors.panelAlt;
                                }
                            }}
                        >
                            <input
                                type="radio"
                                name="product"
                                value={product.id}
                                checked={selectedProductId === product.id}
                                onChange={(e) => setSelectedProductId(e.target.value)}
                                style={{ marginRight: '12px' }}
                            />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500, color: theme.colors.text }}>{product.canonicalName}</div>
                                <div style={{ fontSize: '12px', color: theme.colors.textSubtle }}>
                                    {product.canonicalCode} • {product.installTimeHours}h • {product.wasteVolumeM3}m³
                                    {product.aliases && product.aliases.length > 0 && (
                                        <span style={{ marginLeft: '8px', color: theme.colors.accent }}>
                                            ({product.aliases.length} aliases)
                                        </span>
                                    )}
                                </div>
                            </div>
                        </label>
                    ))}
                </div>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setMode('initial')}
                        style={{
                            flex: 1,
                            background: theme.colors.muted,
                            color: theme.colors.text,
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: theme.radii.md,
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.opacity = '0.8'}
                        onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleAttachToExisting}
                        disabled={!selectedProductId || loading}
                        style={{
                            flex: 1,
                            background: !selectedProductId || loading ? theme.colors.muted : theme.colors.accent,
                            color: 'white',
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: theme.radii.md,
                            fontSize: '14px',
                            fontWeight: 500,
                            cursor: !selectedProductId || loading ? 'not-allowed' : 'pointer',
                            opacity: !selectedProductId || loading ? 0.5 : 1,
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                            if (selectedProductId && !loading) e.currentTarget.style.opacity = '0.9';
                        }}
                        onMouseOut={(e) => {
                            if (selectedProductId && !loading) e.currentTarget.style.opacity = '1';
                        }}
                    >
                        {loading ? 'Attaching...' : 'Attach Alias'}
                    </button>
                </div>

                {message && (
                    <div style={{
                        fontSize: '13px',
                        textAlign: 'center',
                        padding: '10px',
                        background: `${theme.colors.accent}15`,
                        color: theme.colors.accent,
                        borderRadius: theme.radii.sm,
                        border: `1px solid ${theme.colors.accent}30`
                    }}>
                        {message}
                    </div>
                )}
            </div>
        );
    }

    return null;
};

export default ProductAliasAttacher;