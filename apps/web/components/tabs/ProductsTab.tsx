import React, { useEffect, useState } from "react";

import { theme } from "../../lib/theme";

// Enhanced ProductsTab with detailed product information

type Product = {
  id: string | number;
  name: string;
  code: string | null;
  quantity: number;
  source: string;
  estimatedTime?: number;
  totalTime?: number;
  description?: string;
  rawDescription?: string;
  cleanDescription?: string;
};

export default function ProductsTab({
  jobId,
  canManage,
}: {
  jobId: string;
  canManage: boolean;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (jobId) {
      setLoading(true);
      setError(null);

      fetch(`/api/jobs/${jobId}/products`)
        .then(response => response.json())
        .then(result => {
          if (result.data) {
            setProducts(result.data);
          } else {
            setProducts([]);
          }
        })
        .catch(err => {
          console.error('Error fetching products:', err);
          setError('Failed to load products');
          setProducts([]);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [jobId]);

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'quote': return { label: 'SmartQuote', color: theme.colors.accent };
      case 'task_generation': return { label: 'Task Gen', color: '#10b981' };
      default: return { label: source, color: theme.colors.textSubtle };
    }
  };

  if (loading) {
    return (
      <div style={{
        padding: 20,
        textAlign: 'center',
        color: theme.colors.textSubtle
      }}>
        Loading products...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: 20,
        textAlign: 'center',
        color: theme.colors.danger
      }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 600, fontSize: 18 }}>Products</div>
        <div style={{ color: theme.colors.textSubtle, fontSize: 14 }}>
          {products.length} item{products.length !== 1 ? 's' : ''}
        </div>
      </div>

      {products.length === 0 ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: theme.colors.textSubtle,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 12,
          background: theme.colors.panel
        }}>
          <div style={{ marginBottom: 8 }}>No products found for this job</div>
          <div style={{ fontSize: 12 }}>
            Products will appear here when added via SmartQuote or Task Generation
          </div>
        </div>
      ) : (
        <div style={{
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 12,
          overflow: "hidden",
          background: theme.colors.panel
        }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0f151c" }}>
                <th style={{
                  textAlign: "left",
                  padding: "12px 16px",
                  color: theme.colors.textSubtle,
                  fontWeight: 600,
                  fontSize: 12,
                  textTransform: "uppercase"
                }}>
                  Product
                </th>
                <th style={{
                  textAlign: "center",
                  padding: "12px 16px",
                  color: theme.colors.textSubtle,
                  fontWeight: 600,
                  fontSize: 12,
                  textTransform: "uppercase"
                }}>
                  Qty
                </th>
                <th style={{
                  textAlign: "center",
                  padding: "12px 16px",
                  color: theme.colors.textSubtle,
                  fontWeight: 600,
                  fontSize: 12,
                  textTransform: "uppercase"
                }}>
                  Source
                </th>
                {canManage && (
                  <th style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    color: theme.colors.textSubtle,
                    fontWeight: 600,
                    fontSize: 12,
                    textTransform: "uppercase"
                  }}>
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => {
                const sourceBadge = getSourceBadge(product.source);

                return (
                  <tr
                    key={`${product.source}-${product.id}-${index}`}
                    style={{
                      borderTop: index > 0 ? `1px solid ${theme.colors.border}` : "none"
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ color: theme.colors.text, fontWeight: 500, marginBottom: 2 }}>
                        {product.name}
                      </div>
                      {/* Show detailed product information instead of just code */}
                      {(() => {
                        // For SmartQuote products, prefer clean_description, then raw_description
                        if (product.source === 'quote') {
                          const detailText = product.cleanDescription || product.rawDescription;
                          if (detailText && detailText !== product.name) {
                            return (
                              <div style={{ color: theme.colors.textSubtle, fontSize: 12, lineHeight: 1.3 }}>
                                {detailText}
                              </div>
                            );
                          }
                        }

                        // For task generation products, show description if different from name
                        if (product.source === 'task_generation' && product.description && product.description !== product.name) {
                          return (
                            <div style={{ color: theme.colors.textSubtle, fontSize: 12, lineHeight: 1.3 }}>
                              {product.description}
                            </div>
                          );
                        }

                        // Fallback to product code if no other details available
                        if (product.code) {
                          return (
                            <div style={{ color: theme.colors.textSubtle, fontSize: 12 }}>
                              Code: {product.code}
                            </div>
                          );
                        }

                        return null;
                      })()}
                    </td>
                    <td style={{
                      padding: "12px 16px",
                      textAlign: "center",
                      color: theme.colors.text,
                      fontWeight: 500
                    }}>
                      {product.quantity}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <span style={{
                        padding: "3px 6px",
                        borderRadius: 8,
                        fontSize: 10,
                        fontWeight: 600,
                        background: `${sourceBadge.color}20`,
                        color: sourceBadge.color,
                        border: `1px solid ${sourceBadge.color}40`
                      }}>
                        {sourceBadge.label}
                      </span>
                    </td>
                    {canManage && (
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          style={{
                            padding: "6px 12px",
                            borderRadius: 6,
                            border: `1px solid ${theme.colors.border}`,
                            background: theme.colors.panel,
                            color: theme.colors.text,
                            fontSize: 12,
                            cursor: "pointer"
                          }}
                          onClick={() => {
                            // TODO: Implement edit functionality
                            // eslint-disable-next-line no-console
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
