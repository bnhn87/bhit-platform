import React, { useState, useEffect, useCallback } from 'react';

import { FEATURE_FLAGS, updateFeatureFlag, isFeatureEnabled } from '../lib/featureFlags';

interface FeatureFlag {
  flag_key: string;
  name: string;
  description?: string;
  is_enabled: boolean;
  category?: string;
}

export default function FeatureFlagAdmin() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const loadFlags = useCallback(async () => {
    try {
      // For now, create flags from the constants since database might not be ready
      const flagEntries = Object.entries(FEATURE_FLAGS);
      const flagsData: FeatureFlag[] = [];

      for (const [key, value] of flagEntries) {
        const isEnabled = await isFeatureEnabled(value);
        flagsData.push({
          flag_key: value,
          name: key.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' '),
          description: getDescriptionForFlag(value),
          is_enabled: isEnabled,
          category: getCategoryForFlag(value)
        });
      }

      setFlags(flagsData);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const getDescriptionForFlag = (flagKey: string): string => {
    const descriptions: Record<string, string> = {
      [FEATURE_FLAGS.PRODUCT_CROSS_CHECK]: 'Enable advanced product validation in SmartQuote',
      [FEATURE_FLAGS.LABOUR_CALENDAR_VIEW]: 'Interactive calendar for labour allocation',
      [FEATURE_FLAGS.DATABASE_DRIVEN_PRODUCTS]: 'Use database for product install times',
      [FEATURE_FLAGS.DASHBOARD_ANALYTICS]: 'Enhanced dashboard with real-time data',
      [FEATURE_FLAGS.AI_QUOTE_PARSING]: 'Use AI for quote document parsing',
      [FEATURE_FLAGS.QUOTE_DATABASE_PERSISTENCE]: 'Store quotes in database instead of localStorage',
      [FEATURE_FLAGS.EXPERIMENTAL_PLANNING_ENGINE]: 'New planning-driven architecture features',
      [FEATURE_FLAGS.BETA_FLOOR_PLANNER]: 'Next-generation floor planning tools',
      [FEATURE_FLAGS.ADVANCED_LABOUR_TRACKING]: 'Enhanced labour management features',
      [FEATURE_FLAGS.COST_OPTIMIZATION]: 'Advanced cost analysis and optimization'
    };
    return descriptions[flagKey] || 'No description available';
  };

  const getCategoryForFlag = (flagKey: string): string => {
    const categories: Record<string, string> = {
      [FEATURE_FLAGS.PRODUCT_CROSS_CHECK]: 'SmartQuote',
      [FEATURE_FLAGS.LABOUR_CALENDAR_VIEW]: 'Labour',
      [FEATURE_FLAGS.DATABASE_DRIVEN_PRODUCTS]: 'Backend',
      [FEATURE_FLAGS.DASHBOARD_ANALYTICS]: 'Dashboard',
      [FEATURE_FLAGS.AI_QUOTE_PARSING]: 'SmartQuote',
      [FEATURE_FLAGS.QUOTE_DATABASE_PERSISTENCE]: 'Backend',
      [FEATURE_FLAGS.EXPERIMENTAL_PLANNING_ENGINE]: 'Experimental',
      [FEATURE_FLAGS.BETA_FLOOR_PLANNER]: 'Experimental',
      [FEATURE_FLAGS.ADVANCED_LABOUR_TRACKING]: 'Labour',
      [FEATURE_FLAGS.COST_OPTIMIZATION]: 'Costing'
    };
    return categories[flagKey] || 'General';
  };

  const handleToggle = async (flagKey: string, currentEnabled: boolean) => {
    setUpdating(flagKey);
    try {
      const success = await updateFeatureFlag(flagKey, { is_enabled: !currentEnabled });
      if (success) {
        setFlags(prev => prev.map(flag =>
          flag.flag_key === flagKey
            ? { ...flag, is_enabled: !currentEnabled }
            : flag
        ));
      } else {
        alert('Failed to update feature flag');
      }
    } catch {
      alert('Failed to update feature flag');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-neutral-300">Loading feature flags...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-neutral-100 mb-2">Feature Flags</h2>
        <p className="text-neutral-400">Manage feature rollouts and experimental functionality</p>
      </div>

      <div className="space-y-4">
        {flags.map((flag) => (
          <div
            key={flag.flag_key}
            className="flex items-center justify-between p-4 bg-neutral-800 rounded-lg border border-neutral-700"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-neutral-100">{flag.name}</h3>
                <span className="px-2 py-1 text-xs font-medium bg-neutral-700 text-neutral-300 rounded-md">
                  {flag.category}
                </span>
              </div>
              {flag.description && (
                <p className="text-sm text-neutral-400 mt-1">{flag.description}</p>
              )}
              <p className="text-xs text-neutral-500 mt-2">Key: {flag.flag_key}</p>
            </div>

            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${
                flag.is_enabled ? 'text-green-400' : 'text-red-400'
              }`}>
                {flag.is_enabled ? 'Enabled' : 'Disabled'}
              </span>

              <button
                onClick={() => handleToggle(flag.flag_key, flag.is_enabled)}
                disabled={updating === flag.flag_key}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  flag.is_enabled ? 'bg-green-600' : 'bg-neutral-600'
                } ${updating === flag.flag_key ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    flag.is_enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
                {updating === flag.flag_key && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3 h-3 border-t border-white rounded-full animate-spin"></div>
                  </div>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-400 mb-2">Development Note</h4>
        <p className="text-xs text-blue-300">
          Feature flags are currently using fallback values since the database migration is not fully applied.
          Once the database is properly configured, flags will be stored persistently.
        </p>
      </div>
    </div>
  );
}