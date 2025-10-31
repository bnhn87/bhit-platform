
import React, { useState } from 'react';

import { theme } from '../../../lib/theme';
import { ParsedProduct } from '../types';

interface ParseReviewPanelProps {
    products: ParsedProduct[];
    onProductsUpdated: (products: ParsedProduct[]) => void;
    onContinue: () => void;
}

export const ParseReviewPanel: React.FC<ParseReviewPanelProps> = ({ products, onProductsUpdated, onContinue }) => {
    const [editedProducts, setEditedProducts] = useState<ParsedProduct[]>(products);

    const updateProduct = (index: number, field: keyof ParsedProduct, value: string | number) => {
        const updated = [...editedProducts];
        updated[index] = {
            ...updated[index],
            [field]: field === 'quantity' ? parseInt(String(value)) || 0 : value
        };
        setEditedProducts(updated);
    };

    const removeProduct = (index: number) => {
        const updated = editedProducts.filter((_, i) => i !== index);
        setEditedProducts(updated);
    };

    const handleContinue = () => {
        onProductsUpdated(editedProducts);
        onContinue();
    };

    // Identify low confidence products
    const lowConfidenceProducts = editedProducts.filter(p => (p.confidence || 1) < 0.7);
    const hasLowConfidence = lowConfidenceProducts.length > 0;

    return (
        <div style={{
            background: theme.colors.panel,
            borderRadius: theme.radii.xl,
            boxShadow: theme.shadow,
            padding: 32,
            border: `1px solid ${theme.colors.border}`
        }}>
            <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 24, fontWeight: 700, color: theme.colors.text, margin: 0, marginBottom: 8 }}>
                    Review Parsed Products
                </h3>
                <p style={{ fontSize: 14, color: theme.colors.textSubtle, margin: 0 }}>
                    {editedProducts.length} products found
                    {hasLowConfidence && (
                        <span style={{ color: '#f59e0b', marginLeft: 8 }}>
                            ({lowConfidenceProducts.length} need review)
                        </span>
                    )}
                </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 500, overflowY: 'auto', marginBottom: 24 }}>
                {editedProducts.map((product, index) => {
                    const confidence = product.confidence || 1;
                    const isLowConfidence = confidence < 0.7;

                    return (
                        <div
                            key={index}
                            style={{
                                border: `2px solid ${isLowConfidence ? '#f59e0b' : theme.colors.border}`,
                                borderRadius: theme.radii.lg,
                                padding: 16,
                                background: isLowConfidence ? 'rgba(245, 158, 11, 0.05)' : theme.colors.panelAlt
                            }}
                        >
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px 40px', gap: 12, alignItems: 'center' }}>
                                <div>
                                    <label style={{ fontSize: 12, color: theme.colors.textSubtle, display: 'block', marginBottom: 4 }}>
                                        Product Code
                                    </label>
                                    <input
                                        type="text"
                                        value={product.productCode}
                                        onChange={(e) => updateProduct(index, 'productCode', e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: 8,
                                            border: `1px solid ${theme.colors.border}`,
                                            borderRadius: theme.radii.md,
                                            background: theme.colors.background,
                                            color: theme.colors.text,
                                            fontSize: 14
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: 12, color: theme.colors.textSubtle, display: 'block', marginBottom: 4 }}>
                                        Description
                                    </label>
                                    <input
                                        type="text"
                                        value={product.cleanDescription}
                                        onChange={(e) => updateProduct(index, 'cleanDescription', e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: 8,
                                            border: `1px solid ${theme.colors.border}`,
                                            borderRadius: theme.radii.md,
                                            background: theme.colors.background,
                                            color: theme.colors.text,
                                            fontSize: 14
                                        }}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: 12, color: theme.colors.textSubtle, display: 'block', marginBottom: 4 }}>
                                        Quantity
                                    </label>
                                    <input
                                        type="number"
                                        value={product.quantity}
                                        onChange={(e) => updateProduct(index, 'quantity', e.target.value)}
                                        min={1}
                                        style={{
                                            width: '100%',
                                            padding: 8,
                                            border: `1px solid ${theme.colors.border}`,
                                            borderRadius: theme.radii.md,
                                            background: theme.colors.background,
                                            color: theme.colors.text,
                                            fontSize: 14
                                        }}
                                    />
                                </div>

                                <button
                                    onClick={() => removeProduct(index)}
                                    style={{
                                        padding: 8,
                                        border: 'none',
                                        borderRadius: theme.radii.md,
                                        background: theme.colors.danger,
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: 18,
                                        fontWeight: 'bold'
                                    }}
                                    title="Remove product"
                                >
                                    ×
                                </button>
                            </div>

                            {isLowConfidence && (
                                <div style={{
                                    marginTop: 12,
                                    padding: 8,
                                    background: 'rgba(245, 158, 11, 0.1)',
                                    borderRadius: theme.radii.sm,
                                    fontSize: 12,
                                    color: '#f59e0b',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8
                                }}>
                                    <span style={{ fontSize: 16 }}>⚠️</span>
                                    <span>
                                        Low confidence ({Math.round(confidence * 100)}%) - please verify this product
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <button
                onClick={handleContinue}
                style={{
                    width: '100%',
                    padding: '16px 24px',
                    border: 'none',
                    fontSize: 16,
                    fontWeight: 600,
                    borderRadius: theme.radii.lg,
                    color: 'white',
                    background: `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentAlt})`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                }}
            >
                Continue with {editedProducts.length} Products
            </button>
        </div>
    );
};
