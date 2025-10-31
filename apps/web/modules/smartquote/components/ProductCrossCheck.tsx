/**
 * Product Cross-Check Component
 * Validates and cross-references product codes against database and external sources
 * Provides suggestions for unknown products and flags potential issues
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { DatabaseProduct } from '../services/databaseProductService';
import { searchProducts, getProductByCode } from '../services/enhancedConfigService';
import { CalculatedProduct, ProductReference } from '../types';

interface ProductCrossCheckProps {
  products: CalculatedProduct[];
  onProductUpdate: (lineNumber: number, updates: Partial<CalculatedProduct>) => void;
  onProductValidated: (lineNumber: number, validatedData: ProductReference) => void;
}

interface CrossCheckResult {
  lineNumber: number;
  productCode: string;
  status: 'valid' | 'unknown' | 'suspicious' | 'error';
  confidence: number;
  suggestions: DatabaseProduct[];
  issues: string[];
  recommendedAction?: string;
}

interface ValidationRule {
  name: string;
  validate: (product: CalculatedProduct) => { passed: boolean; message?: string };
}

const validationRules: ValidationRule[] = [
  {
    name: 'Product Code Format',
    validate: (product) => {
      const code = product.productCode?.trim();
      if (!code) return { passed: false, message: 'Missing product code' };
      if (code.length < 2) return { passed: false, message: 'Product code too short' };
      if (!/^[A-Z0-9\-_]+$/i.test(code)) return { passed: false, message: 'Invalid product code format' };
      return { passed: true };
    }
  },
  {
    name: 'Time Validation',
    validate: (product) => {
      if (product.timePerUnit <= 0) return { passed: false, message: 'Install time must be positive' };
      if (product.timePerUnit > 8) return { passed: false, message: 'Install time seems excessive (>8 hours)' };
      return { passed: true };
    }
  },
  {
    name: 'Waste Validation',
    validate: (product) => {
      if (product.wastePerUnit < 0) return { passed: false, message: 'Waste volume cannot be negative' };
      if (product.wastePerUnit > 1) return { passed: false, message: 'Waste volume seems excessive (>1m³)' };
      return { passed: true };
    }
  },
  {
    name: 'Quantity Validation',
    validate: (product) => {
      if (product.quantity <= 0) return { passed: false, message: 'Quantity must be positive' };
      if (product.quantity > 1000) return { passed: false, message: 'Quantity seems excessive (>1000)' };
      return { passed: true };
    }
  },
  {
    name: 'Description Quality',
    validate: (product) => {
      const desc = product.description?.trim();
      if (!desc) return { passed: false, message: 'Missing product description' };
      if (desc.length < 5) return { passed: false, message: 'Description too short' };
      return { passed: true };
    }
  }
];

export function ProductCrossCheck({ products, onProductUpdate, onProductValidated }: ProductCrossCheckProps) {
  const [crossCheckResults, setCrossCheckResults] = useState<CrossCheckResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [_selectedProduct, _setSelectedProduct] = useState<number | null>(null);
  const [searchCache, setSearchCache] = useState<Map<string, DatabaseProduct[]>>(new Map());

  // Process individual product cross-check
  const processProductCrossCheck = useCallback(async (product: CalculatedProduct): Promise<CrossCheckResult> => {
    const productCode = product.productCode?.trim().toUpperCase() || '';
    const issues: string[] = [];
    let status: CrossCheckResult['status'] = 'valid';
    let confidence = 1.0;
    let suggestions: DatabaseProduct[] = [];

    // Run validation rules
    for (const rule of validationRules) {
      const validation = rule.validate(product);
      if (!validation.passed) {
        issues.push(`${rule.name}: ${validation.message}`);
        status = 'error';
        confidence = Math.min(confidence, 0.3);
      }
    }

    // Check against database
    if (productCode) {
      try {
        const dbProduct = await getProductByCode(productCode);

        if (dbProduct) {
          // Compare with database values
          const timeDiff = Math.abs(product.timePerUnit - dbProduct.installTimeHours);
          const wasteDiff = Math.abs(product.wastePerUnit - dbProduct.wasteVolumeM3);

          if (timeDiff > 0.5) {
            issues.push(`Time differs from database: ${dbProduct.installTimeHours.toFixed(2)}h vs ${product.timePerUnit.toFixed(2)}h`);
            status = status === 'valid' ? 'suspicious' : status;
            confidence = Math.min(confidence, 0.7);
          }

          if (wasteDiff > 0.02) {
            issues.push(`Waste differs from database: ${dbProduct.wasteVolumeM3}m³ vs ${product.wastePerUnit}m³`);
            status = status === 'valid' ? 'suspicious' : status;
            confidence = Math.min(confidence, 0.7);
          }
        } else {
          // Product not found in database - search for similar ones
          const searchTerms = [
            productCode,
            product.description?.split(' ').slice(0, 3).join(' ') || '',
            product.cleanDescription?.split(' ').slice(0, 3).join(' ') || ''
          ].filter(term => term.length > 2);

          for (const term of searchTerms) {
            if (!searchCache.has(term)) {
              const searchResults = await searchProducts(term);
              searchCache.set(term, searchResults);
              setSearchCache(new Map(searchCache));
            }

            const results = searchCache.get(term) || [];
            suggestions.push(...results);
          }

          // Remove duplicates and limit suggestions
          suggestions = suggestions
            .filter((item, index, arr) => arr.findIndex(i => i.id === item.id) === index)
            .slice(0, 5);

          if (suggestions.length === 0) {
            status = 'unknown';
            confidence = 0.2;
            issues.push('Product not found in database and no similar products found');
          } else {
            status = status === 'valid' ? 'suspicious' : status;
            confidence = Math.min(confidence, 0.5);
            issues.push(`Product not in database. Found ${suggestions.length} similar products`);
          }
        }
      } catch (error) {
        console.error('Error checking product:', error);
        issues.push('Failed to check against database');
        status = 'error';
        confidence = 0.1;
      }
    }

    return {
      lineNumber: product.lineNumber,
      productCode,
      status,
      confidence,
      suggestions,
      issues,
      recommendedAction: getRecommendedAction(status, issues.length)
    };
  }, [searchCache]);

  // Process all products for cross-checking
  const processCrossCheck = useCallback(async () => {
    setIsProcessing(true);
    const results: CrossCheckResult[] = [];

    for (const product of products) {
      const result = await processProductCrossCheck(product);
      results.push(result);
    }

    setCrossCheckResults(results);
    setIsProcessing(false);
  }, [products, processProductCrossCheck]);

  const getRecommendedAction = (status: CrossCheckResult['status'], issueCount: number): string => {
    switch (status) {
      case 'error':
        return 'Fix validation errors before proceeding';
      case 'unknown':
        return 'Review similar products or add to database';
      case 'suspicious':
        return issueCount > 1 ? 'Multiple issues detected - review carefully' : 'Minor discrepancy - verify values';
      default:
        return 'Product validated successfully';
    }
  };

  const getStatusColor = (status: CrossCheckResult['status']) => {
    switch (status) {
      case 'valid': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'unknown': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'suspicious': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'error': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  const getStatusIcon = (status: CrossCheckResult['status']) => {
    switch (status) {
      case 'valid': return '✓';
      case 'unknown': return '?';
      case 'suspicious': return '⚠';
      case 'error': return '✗';
      default: return '○';
    }
  };

  const handleApplySuggestion = async (lineNumber: number, suggestion: DatabaseProduct) => {
    const productReference: ProductReference = {
      installTimeHours: suggestion.install_time_hours,
      wasteVolumeM3: suggestion.waste_volume_m3,
      isHeavy: suggestion.is_heavy
    };

    onProductUpdate(lineNumber, {
      productCode: suggestion.product_code,
      timePerUnit: suggestion.install_time_hours,
      wastePerUnit: suggestion.waste_volume_m3,
      isHeavy: suggestion.is_heavy,
      source: 'catalogue' as const
    });

    onProductValidated(lineNumber, productReference);

    // Refresh cross-check for this product
    const updatedProduct = products.find(p => p.lineNumber === lineNumber);
    if (updatedProduct) {
      const result = await processProductCrossCheck({
        ...updatedProduct,
        productCode: suggestion.product_code,
        timePerUnit: suggestion.install_time_hours,
        wastePerUnit: suggestion.waste_volume_m3,
        isHeavy: suggestion.is_heavy
      });

      setCrossCheckResults(prev =>
        prev.map(r => r.lineNumber === lineNumber ? result : r)
      );
    }
  };

  // Auto-run cross-check when products change
  useEffect(() => {
    if (products.length > 0) {
      processCrossCheck();
    }
  }, [products.length, processCrossCheck]);

  // Summary statistics
  const summary = useMemo(() => {
    const total = crossCheckResults.length;
    const valid = crossCheckResults.filter(r => r.status === 'valid').length;
    const unknown = crossCheckResults.filter(r => r.status === 'unknown').length;
    const suspicious = crossCheckResults.filter(r => r.status === 'suspicious').length;
    const errors = crossCheckResults.filter(r => r.status === 'error').length;
    const avgConfidence = total > 0
      ? crossCheckResults.reduce((sum, r) => sum + r.confidence, 0) / total
      : 0;

    return { total, valid, unknown, suspicious, errors, avgConfidence };
  }, [crossCheckResults]);

  if (isProcessing) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="text-neutral-300">Cross-checking products against database...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-neutral-100">Product Cross-Check</h3>
        <button
          onClick={processCrossCheck}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Re-check All
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-neutral-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-neutral-100">{summary.total}</div>
          <div className="text-sm text-neutral-400">Total Products</div>
        </div>
        <div className="bg-green-400/10 border border-green-400/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{summary.valid}</div>
          <div className="text-sm text-green-300">Valid</div>
        </div>
        <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-400">{summary.unknown}</div>
          <div className="text-sm text-yellow-300">Unknown</div>
        </div>
        <div className="bg-orange-400/10 border border-orange-400/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-400">{summary.suspicious}</div>
          <div className="text-sm text-orange-300">Suspicious</div>
        </div>
        <div className="bg-red-400/10 border border-red-400/20 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-400">{summary.errors}</div>
          <div className="text-sm text-red-300">Errors</div>
        </div>
      </div>

      {/* Confidence Score */}
      <div className="bg-neutral-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-neutral-300">Overall Confidence</span>
          <span className="text-neutral-100 font-semibold">
            {(summary.avgConfidence * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-neutral-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              summary.avgConfidence >= 0.8 ? 'bg-green-500' :
              summary.avgConfidence >= 0.6 ? 'bg-yellow-500' :
              summary.avgConfidence >= 0.4 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${summary.avgConfidence * 100}%` }}
          />
        </div>
      </div>

      {/* Product Results */}
      <div className="space-y-3">
        <h4 className="text-lg font-medium text-neutral-100">Product Validation Results</h4>

        {crossCheckResults.map((result) => {
          const product = products.find(p => p.lineNumber === result.lineNumber);
          if (!product) return null;

          return (
            <div
              key={result.lineNumber}
              className={`border rounded-lg p-4 transition-colors ${getStatusColor(result.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{getStatusIcon(result.status)}</span>
                    <div>
                      <div className="font-medium">
                        Line {result.lineNumber}: {result.productCode || 'No Code'}
                      </div>
                      <div className="text-sm opacity-80">{product.description}</div>
                    </div>
                  </div>

                  {result.issues.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Issues:</div>
                      <ul className="text-sm space-y-1">
                        {result.issues.map((issue, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span>•</span>
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.recommendedAction && (
                    <div className="text-sm">
                      <span className="font-medium">Recommended: </span>
                      {result.recommendedAction}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <div className="text-sm font-medium">
                    {(result.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs opacity-60">confidence</div>
                </div>
              </div>

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-current border-opacity-20">
                  <div className="text-sm font-medium mb-2">Similar Products Found:</div>
                  <div className="space-y-2">
                    {result.suggestions.slice(0, 3).map((suggestion, _index) => (
                      <div
                        key={suggestion.id}
                        className="flex items-center justify-between bg-black bg-opacity-20 rounded p-2"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-sm">{suggestion.product_code}</div>
                          <div className="text-xs opacity-80">{suggestion.product_name}</div>
                          <div className="text-xs">
                            {suggestion.install_time_hours}h • {suggestion.waste_volume_m3}m³
                            {suggestion.is_heavy && ' • Heavy'}
                          </div>
                        </div>
                        <button
                          onClick={() => handleApplySuggestion(result.lineNumber, suggestion)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {crossCheckResults.length === 0 && (
        <div className="text-center py-8 text-neutral-400">
          No products to cross-check. Add products to your quote to validate them.
        </div>
      )}
    </div>
  );
}