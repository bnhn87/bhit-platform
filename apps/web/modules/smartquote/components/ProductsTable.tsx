import React, { useState } from 'react';
import { theme } from '../../../lib/theme';
import { CalculatedProduct } from '../types';
import { getDashboardCardStyle, getDashboardTypographyStyle } from '../utils/dashboardStyles';
import { TableIcon, DownloadIcon, ClipboardIcon, CheckCircleIcon } from './icons';

interface ProductsTableProps {
    products: CalculatedProduct[];
    showTimeColumn?: boolean;
    isPowerGrouped?: boolean;
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
    products,
    showTimeColumn = true,
    isPowerGrouped = false
}) => {
    const [copied, setCopied] = useState(false);

    // Format products according to BHIT spec
    const formatProductLine = (product: CalculatedProduct): string => {
        const line = product.lineNumber === 999 ? 'END' : product.lineNumber.toString();
        const description = product.cleanDescription || product.description || product.rawDescription;
        const formattedDesc = `Line ${line} – ${description}`;

        // Round time to 2 decimal places
        const timePerUnit = product.timePerUnit ? product.timePerUnit.toFixed(2) : 'TBC';

        return {
            worksOrderLine: `Line ${line}`,
            productCode: product.productCode,
            description: formattedDesc,
            quantity: product.quantity.toString(),
            timePerUnit: timePerUnit
        };
    };

    // Sort products - power items at end
    const sortedProducts = [...products].sort((a, b) => {
        if (a.lineNumber === 999) return 1;
        if (b.lineNumber === 999) return -1;
        return a.lineNumber - b.lineNumber;
    });

    const formattedProducts = sortedProducts.map(formatProductLine);

    // Generate TSV for clipboard
    const generateTSV = () => {
        const headers = showTimeColumn
            ? ['Works Order Line', 'Product Code', 'Description', 'Quantity', 'Time (hours per unit)']
            : ['Works Order Line', 'Product Code', 'Description', 'Quantity'];

        const rows = formattedProducts.map(p =>
            showTimeColumn
                ? [p.worksOrderLine, p.productCode, p.description, p.quantity, p.timePerUnit]
                : [p.worksOrderLine, p.productCode, p.description, p.quantity]
        );

        const tsv = [headers, ...rows].map(row => row.join('\t')).join('\n');
        return tsv;
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generateTSV());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const totalTime = products.reduce((sum, p) => sum + (p.totalTime || 0), 0);
    const totalQuantity = products.reduce((sum, p) => sum + p.quantity, 0);

    return (
        <div style={{
            ...getDashboardCardStyle('standard'),
            padding: 0,
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div style={{
                padding: '20px 24px',
                borderBottom: `1px solid ${theme.colors.border}`,
                background: theme.colors.panelAlt,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <TableIcon style={{ width: 24, height: 24, color: theme.colors.accent }} />
                    <div>
                        <h3 style={{
                            ...getDashboardTypographyStyle('sectionHeader'),
                            margin: 0,
                            color: theme.colors.text
                        }}>Product Schedule</h3>
                        <p style={{
                            ...getDashboardTypographyStyle('smallText'),
                            margin: '4px 0 0 0',
                            color: theme.colors.textSubtle
                        }}>
                            {products.length} items • {totalQuantity} units total
                            {showTimeColumn && ` • ${totalTime.toFixed(2)} hours`}
                        </p>
                    </div>
                </div>

                <button
                    onClick={copyToClipboard}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: copied ? theme.colors.success : theme.colors.accent,
                        color: 'white',
                        border: 'none',
                        borderRadius: theme.radii.md,
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 500,
                        transition: 'all 0.2s ease'
                    }}
                >
                    {copied ? (
                        <>
                            <CheckCircleIcon style={{ width: 16, height: 16 }} />
                            Copied!
                        </>
                    ) : (
                        <>
                            <ClipboardIcon style={{ width: 16, height: 16 }} />
                            Copy Table
                        </>
                    )}
                </button>
            </div>

            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '14px'
                }}>
                    <thead>
                        <tr style={{ background: theme.colors.panel }}>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontWeight: 600,
                                color: theme.colors.textSubtle,
                                borderBottom: `2px solid ${theme.colors.border}`,
                                whiteSpace: 'nowrap',
                                width: '120px'
                            }}>
                                Works Order Line
                            </th>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontWeight: 600,
                                color: theme.colors.textSubtle,
                                borderBottom: `2px solid ${theme.colors.border}`,
                                whiteSpace: 'nowrap',
                                width: '150px'
                            }}>
                                Product Code
                            </th>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'left',
                                fontWeight: 600,
                                color: theme.colors.textSubtle,
                                borderBottom: `2px solid ${theme.colors.border}`,
                                minWidth: '300px'
                            }}>
                                Description
                            </th>
                            <th style={{
                                padding: '12px 16px',
                                textAlign: 'center',
                                fontWeight: 600,
                                color: theme.colors.textSubtle,
                                borderBottom: `2px solid ${theme.colors.border}`,
                                width: '80px'
                            }}>
                                Quantity
                            </th>
                            {showTimeColumn && (
                                <th style={{
                                    padding: '12px 16px',
                                    textAlign: 'center',
                                    fontWeight: 600,
                                    color: theme.colors.textSubtle,
                                    borderBottom: `2px solid ${theme.colors.border}`,
                                    whiteSpace: 'nowrap',
                                    width: '120px'
                                }}>
                                    Time (hours/unit)
                                </th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {formattedProducts.map((product, index) => {
                            const isPowerRow = product.productCode === 'POWER-MODULE';
                            const isLastRow = index === formattedProducts.length - 1;

                            return (
                                <tr
                                    key={index}
                                    style={{
                                        background: isPowerRow
                                            ? `linear-gradient(90deg, ${theme.colors.accent}10, ${theme.colors.panel})`
                                            : index % 2 === 0 ? theme.colors.bg : theme.colors.panel,
                                        transition: 'background 0.2s ease'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = theme.colors.panelAlt;
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = isPowerRow
                                            ? `linear-gradient(90deg, ${theme.colors.accent}10, ${theme.colors.panel})`
                                            : index % 2 === 0 ? theme.colors.bg : theme.colors.panel;
                                    }}
                                >
                                    <td style={{
                                        padding: '12px 16px',
                                        borderBottom: isLastRow ? 'none' : `1px solid ${theme.colors.border}`,
                                        color: theme.colors.textSubtle,
                                        fontWeight: isPowerRow ? 600 : 400
                                    }}>
                                        {product.worksOrderLine}
                                    </td>
                                    <td style={{
                                        padding: '12px 16px',
                                        borderBottom: isLastRow ? 'none' : `1px solid ${theme.colors.border}`,
                                        color: theme.colors.text,
                                        fontFamily: 'monospace',
                                        fontSize: '13px',
                                        fontWeight: isPowerRow ? 600 : 400
                                    }}>
                                        {product.productCode}
                                    </td>
                                    <td style={{
                                        padding: '12px 16px',
                                        borderBottom: isLastRow ? 'none' : `1px solid ${theme.colors.border}`,
                                        color: theme.colors.text,
                                        fontWeight: isPowerRow ? 600 : 400
                                    }}>
                                        {isPowerRow && '⚡ '}
                                        {product.description}
                                    </td>
                                    <td style={{
                                        padding: '12px 16px',
                                        borderBottom: isLastRow ? 'none' : `1px solid ${theme.colors.border}`,
                                        color: theme.colors.text,
                                        textAlign: 'center',
                                        fontWeight: isPowerRow ? 600 : 500
                                    }}>
                                        {product.quantity}
                                    </td>
                                    {showTimeColumn && (
                                        <td style={{
                                            padding: '12px 16px',
                                            borderBottom: isLastRow ? 'none' : `1px solid ${theme.colors.border}`,
                                            color: product.timePerUnit === 'TBC'
                                                ? theme.colors.accent
                                                : theme.colors.text,
                                            textAlign: 'center',
                                            fontWeight: product.timePerUnit === 'TBC' ? 600 : 500,
                                            fontFamily: 'monospace',
                                            fontSize: '13px'
                                        }}>
                                            {product.timePerUnit}
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                    {showTimeColumn && (
                        <tfoot>
                            <tr style={{ background: theme.colors.panelAlt }}>
                                <td colSpan={3} style={{
                                    padding: '12px 16px',
                                    borderTop: `2px solid ${theme.colors.border}`,
                                    fontWeight: 600,
                                    color: theme.colors.text
                                }}>
                                    Total Installation Time
                                </td>
                                <td style={{
                                    padding: '12px 16px',
                                    borderTop: `2px solid ${theme.colors.border}`,
                                    textAlign: 'center',
                                    fontWeight: 600,
                                    color: theme.colors.text
                                }}>
                                    {totalQuantity}
                                </td>
                                <td style={{
                                    padding: '12px 16px',
                                    borderTop: `2px solid ${theme.colors.border}`,
                                    textAlign: 'center',
                                    fontWeight: 700,
                                    color: theme.colors.accent,
                                    fontSize: '16px'
                                }}>
                                    {totalTime.toFixed(2)}h
                                </td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Footer Notes */}
            {isPowerGrouped && (
                <div style={{
                    padding: '16px 24px',
                    borderTop: `1px solid ${theme.colors.border}`,
                    background: `linear-gradient(90deg, ${theme.colors.accent}05, ${theme.colors.panel})`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}>
                    <span style={{ fontSize: '20px' }}>⚡</span>
                    <p style={{
                        ...getDashboardTypographyStyle('smallText'),
                        margin: 0,
                        color: theme.colors.text
                    }}>
                        Power modules consolidated at end of table • 0.2 hours per unit • Cable trays excluded
                    </p>
                </div>
            )}
        </div>
    );
};