import React, { useState, useEffect, useCallback } from 'react';

import { ProductProgress, LabourMetrics } from '../../lib/labour-calculator';

interface ProjectDashboardProps {
  jobId: string;
  onProductUpdate: (productId: string, updates: Record<string, unknown>) => void;
  onBulkUpdate: (filters: Record<string, unknown>, updates: Record<string, unknown>) => void;
  isOffline?: boolean;
}

interface ProjectData {
  products: ProductProgress[];
  labourMetrics: LabourMetrics;
  isLoading: boolean;
}

export default function ProjectDashboard({
  jobId,
  onProductUpdate,
  onBulkUpdate,
  isOffline = false
}: ProjectDashboardProps) {
  const [data, setData] = useState<ProjectData>({
    products: [],
    labourMetrics: {
      hoursRemaining: 0,
      requiredTeamSize: 4,
      projectedCompletion: new Date(),
      efficiency: 100,
      burnRate: 32,
      daysAhead: 0,
      alerts: []
    },
    isLoading: true
  });

  const [selectedFilter, setSelectedFilter] = useState<'all' | 'in_progress' | 'not_started' | 'completed'>('all');

  const loadProjectData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, isLoading: true }));

      // Fetch labour analysis
      const response = await fetch(`/api/v2/projects/${jobId}/labour-analysis`);
      const analysisData = await response.json();

      if (analysisData.success) {
        setData(prev => ({
          ...prev,
          labourMetrics: analysisData.analysis,
          isLoading: false
        }));

        // Fetch products separately (assuming they're in the analysis)
        if (analysisData.analysis.products) {
          setData(prev => ({
            ...prev,
            products: analysisData.analysis.products
          }));
        }
      }
    } catch {
      setData(prev => ({ ...prev, isLoading: false }));
    }
  }, [jobId]);

  useEffect(() => {
    loadProjectData();
  }, [jobId, loadProjectData]);

  const handleQuickUpdate = async (productId: string, increment: number) => {
    const product = data.products.find(p => p.id === productId);
    if (!product) return;

    const newCompleted = Math.max(0, Math.min(
      product.completed_units + increment,
      product.total_quantity
    ));

    // Optimistic update
    setData(prev => ({
      ...prev,
      products: prev.products.map(p =>
        p.id === productId
          ? { ...p, completed_units: newCompleted, last_updated: new Date().toISOString() }
          : p
      )
    }));

    try {
      await onProductUpdate(productId, { completed: newCompleted });
    } catch {
      // Rollback on failure
      setData(prev => ({
        ...prev,
        products: prev.products.map(p =>
          p.id === productId ? product : p
        )
      }));
    }
  };

  const handleBulkComplete = async (productType: string) => {

    // Optimistic update
    setData(prev => ({
      ...prev,
      products: prev.products.map(p =>
        p.product_type === productType
          ? { ...p, completed_units: p.total_quantity, status: 'completed' as const }
          : p
      )
    }));

    try {
      await onBulkUpdate(
        { product_type: productType },
        { status: 'completed', completed: null } // completed will be set to total automatically
      );
    } catch {
      // Rollback on failure
      loadProjectData();
    }
  };

  const filteredProducts = data.products.filter(product => {
    if (selectedFilter === 'all') return true;
    return product.status === selectedFilter;
  });

  const overallProgress = data.products.length > 0
    ? {
        completed: data.products.reduce((sum, p) => sum + p.completed_units, 0),
        total: data.products.reduce((sum, p) => sum + p.total_quantity, 0)
      }
    : { completed: 0, total: 1 };

  const progressPercentage = Math.round((overallProgress.completed / overallProgress.total) * 100);

  if (data.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20"> {/* Bottom padding for mobile navigation */}
      {/* Offline indicator */}
      {isOffline && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded-lg text-sm">
          📱 Offline mode - Changes will sync when connection returns
        </div>
      )}

      {/* Quick Actions Bar */}
      <div className="sticky top-0 bg-white border-b z-10 px-4 py-3 -mx-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Site Progress</h1>
          <button
            onClick={() => loadProjectData()}
            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
          >
            🔄
          </button>
        </div>
      </div>

      {/* Overall Progress Card */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Overall Progress</h2>
            <p className="text-blue-100">
              {overallProgress.completed} / {overallProgress.total} units
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{progressPercentage}%</div>
            <p className="text-blue-100 text-sm">Complete</p>
          </div>
        </div>
        
        <div className="w-full bg-blue-400 rounded-full h-2">
          <div
            className="bg-white h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
      </div>

      {/* Labour Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-600">Hours Remaining</div>
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(data.labourMetrics.hoursRemaining)}
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-600">Team Required</div>
          <div className="text-2xl font-bold text-gray-900">
            {data.labourMetrics.requiredTeamSize}
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-600">Efficiency</div>
          <div className="text-2xl font-bold text-gray-900">
            {Math.round(data.labourMetrics.efficiency)}%
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border">
          <div className="text-sm text-gray-600">Days Ahead</div>
          <div className={`text-2xl font-bold ${
            data.labourMetrics.daysAhead >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {data.labourMetrics.daysAhead > 0 ? '+' : ''}{data.labourMetrics.daysAhead}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {data.labourMetrics.alerts.length > 0 && (
        <div className="space-y-2">
          {data.labourMetrics.alerts.slice(0, 2).map((alert, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg text-sm ${
                alert.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : alert.type === 'warning'
                  ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              <div className="font-medium">{alert.message}</div>
              {alert.action && (
                <div className="text-xs mt-1 opacity-75">{alert.action}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        {[
          { key: 'all', label: 'All' },
          { key: 'not_started', label: 'To Do' },
          { key: 'in_progress', label: 'Active' },
          { key: 'completed', label: 'Done' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedFilter(tab.key as typeof selectedFilter)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              selectedFilter === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Product Cards */}
      <div className="space-y-3">
        {filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onQuickUpdate={handleQuickUpdate}
            onBulkComplete={() => handleBulkComplete(product.product_type)}
          />
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No products found for selected filter
        </div>
      )}
    </div>
  );
}

interface ProductCardProps {
  product: ProductProgress;
  onQuickUpdate: (productId: string, increment: number) => void;
  onBulkComplete: () => void;
}

function ProductCard({ product, onQuickUpdate }: ProductCardProps) {
  const progress = Math.round((product.completed_units / product.total_quantity) * 100);
  const remaining = product.total_quantity - product.completed_units;
  
  const statusColors = {
    not_started: 'bg-gray-100 text-gray-700',
    in_progress: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700',
    on_hold: 'bg-yellow-100 text-yellow-700',
    blocked: 'bg-red-100 text-red-700'
  };

  return (
    <div className="bg-white rounded-lg border p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {product.product_name || product.product_type}
          </h3>
          <p className="text-sm text-gray-500">
            {product.completed_units} / {product.total_quantity} units
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[product.status]}`}>
          {product.status.replace('_', ' ')}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{progress}% complete</span>
          <span className="text-gray-600">
            {Math.round(remaining * product.estimated_hours_per_unit)}h remaining
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              progress === 100 ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onQuickUpdate(product.id, 1)}
            disabled={product.completed_units >= product.total_quantity}
            className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors min-w-[44px]"
          >
            +1
          </button>
          <button
            onClick={() => onQuickUpdate(product.id, 5)}
            disabled={product.completed_units >= product.total_quantity}
            className="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors min-w-[44px]"
          >
            +5
          </button>
          {remaining > 0 && (
            <button
              onClick={() => onQuickUpdate(product.id, remaining)}
              className="bg-green-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
            >
              Complete
            </button>
          )}
        </div>
        
        {product.completed_units > 0 && (
          <button
            onClick={() => onQuickUpdate(product.id, -1)}
            className="text-gray-400 hover:text-gray-600 p-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            ↩️
          </button>
        )}
      </div>
    </div>
  );
}