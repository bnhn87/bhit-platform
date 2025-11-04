/**
 * Feature Flags Service for BHIT Work OS
 * Provides client-side feature flag management with caching and analytics
 */

import { useState, useEffect } from 'react';

import { supabase } from './supabaseClient';

export interface FeatureFlag {
  id: string;
  flag_key: string;
  name: string;
  description?: string;
  is_enabled: boolean;
  flag_type: 'boolean' | 'percentage' | 'user_list' | 'role_based' | 'variant';
  conditions: Record<string, unknown>;
  category: string;
  environment: string;
  rollout_percentage: number;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlagOverride {
  user_id: string;
  flag_key: string;
  is_enabled: boolean;
  reason?: string;
  expires_at?: string;
}

// Cache for feature flags to avoid repeated database calls
class FeatureFlagCache {
  private cache = new Map<string, { value: boolean; timestamp: number }>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  get(key: string): boolean | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > this.cacheTimeout;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.value;
  }

  set(key: string, value: boolean): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  clearFlag(key: string): void {
    this.cache.delete(key);
  }
}

const flagCache = new FeatureFlagCache();

/**
 * Check if a feature flag is enabled for the current user
 * Falls back to hardcoded values if database is not available
 */
export async function isFeatureEnabled(flagKey: string): Promise<boolean> {
  // Check cache first
  const cached = flagCache.get(flagKey);
  if (cached !== null) {
    return cached;
  }

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      const fallbackValue = getFallbackFlagValue(flagKey);
      flagCache.set(flagKey, fallbackValue);
      return fallbackValue;
    }

    // Try to check database first
    try {
      const { data: flags, error } = await supabase
        .from('feature_flags')
        .select('is_enabled')
        .eq('flag_key', flagKey)
        .maybeSingle();

      if (!error && flags) {
        const isEnabled = flags.is_enabled || false;
        flagCache.set(flagKey, isEnabled);
        return isEnabled;
      }
    } catch (dbError) {
      console.warn('Database feature flags not available, using fallback:', dbError);
    }

    // Fallback to hardcoded values
    const fallbackValue = getFallbackFlagValue(flagKey);
    flagCache.set(flagKey, fallbackValue);
    return fallbackValue;

  } catch (error: unknown) {
    console.error('Failed to check feature flag:', error);
    const fallbackValue = getFallbackFlagValue(flagKey);
    flagCache.set(flagKey, fallbackValue);
    return fallbackValue;
  }
}

/**
 * Get fallback flag values when database is not available
 */
function getFallbackFlagValue(flagKey: string): boolean {
  const fallbackFlags: Record<string, boolean> = {
    [FEATURE_FLAGS.PRODUCT_CROSS_CHECK]: true,
    [FEATURE_FLAGS.LABOUR_CALENDAR_VIEW]: true,
    [FEATURE_FLAGS.DATABASE_DRIVEN_PRODUCTS]: true,
    [FEATURE_FLAGS.DASHBOARD_ANALYTICS]: true,
    [FEATURE_FLAGS.AI_QUOTE_PARSING]: true,
    [FEATURE_FLAGS.QUOTE_DATABASE_PERSISTENCE]: true,
    [FEATURE_FLAGS.EXPERIMENTAL_PLANNING_ENGINE]: false,
    [FEATURE_FLAGS.BETA_FLOOR_PLANNER]: false,
    [FEATURE_FLAGS.ADVANCED_LABOUR_TRACKING]: false,
    [FEATURE_FLAGS.COST_OPTIMIZATION]: false
  };

  return fallbackFlags[flagKey] || false;
}

/**
 * Check multiple feature flags at once
 */
export async function checkFeatureFlags(flagKeys: string[]): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};

  // Check cache first
  const uncachedKeys: string[] = [];
  for (const key of flagKeys) {
    const cached = flagCache.get(key);
    if (cached !== null) {
      results[key] = cached;
    } else {
      uncachedKeys.push(key);
    }
  }

  // Fetch uncached flags
  if (uncachedKeys.length > 0) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        uncachedKeys.forEach(key => {
          results[key] = false;
          flagCache.set(key, false);
        });
        return results;
      }

      // Fetch flags from database
      const { data: flags, error } = await supabase
        .from('feature_flags')
        .select('flag_key, is_enabled, flag_type, rollout_percentage, conditions')
        .in('flag_key', uncachedKeys);

      if (error) {
        console.error('Error fetching feature flags:', error);
        uncachedKeys.forEach(key => {
          results[key] = false;
          flagCache.set(key, false);
        });
        return results;
      }

      // Process each flag
      for (const flag of flags || []) {
        let isEnabled = false;

        if (flag.is_enabled) {
          switch (flag.flag_type) {
            case 'boolean':
              isEnabled = true;
              break;

            case 'percentage':
              // Generate consistent hash for user + flag
              const hash = await generateUserFlagHash(user.id, flag.flag_key);
              const percentage = (hash % 10000) / 100; // 0-99.99
              isEnabled = percentage < flag.rollout_percentage;
              break;

            case 'role_based':
              // Get user role and check conditions
              const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', user.id)
                .single();

              if (userData && flag.conditions?.allowed_roles?.includes(userData.role)) {
                isEnabled = true;
              }
              break;

            default:
              isEnabled = false;
          }
        }

        results[flag.flag_key] = isEnabled;
        flagCache.set(flag.flag_key, isEnabled);
      }

      // Set false for any flags not found in database
      uncachedKeys.forEach(key => {
        if (!(key in results)) {
          results[key] = false;
          flagCache.set(key, false);
        }
      });

    } catch (error: unknown) {
      console.error('Failed to fetch feature flags:', error);
      uncachedKeys.forEach(key => {
        results[key] = false;
        flagCache.set(key, false);
      });
    }
  }

  return results;
}

/**
 * Track feature flag usage for analytics
 */
export async function trackFeatureUsage(
  flagKey: string,
  eventType: 'check' | 'enabled' | 'disabled' | 'interaction',
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase.rpc('track_feature_usage', {
      p_flag_key: flagKey,
      p_event_type: eventType,
      p_metadata: metadata
    });
  } catch (error: unknown) {
    console.error('Failed to track feature usage:', error);
  }
}

/**
 * Get all feature flags (admin function)
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  try {
    const { data, error } = await supabase
      .from('feature_flags')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching all feature flags:', error);
      return [];
    }

    return data || [];
  } catch (error: unknown) {
    console.error('Failed to fetch all feature flags:', error);
    return [];
  }
}

/**
 * Update a feature flag (admin function)
 */
export async function updateFeatureFlag(
  flagKey: string,
  updates: {
    is_enabled?: boolean;
    rollout_percentage?: number;
    conditions?: Record<string, unknown>;
  }
): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('update_feature_flag', {
      p_flag_key: flagKey,
      p_is_enabled: updates.is_enabled,
      p_rollout_percentage: updates.rollout_percentage,
      p_conditions: updates.conditions
    });

    if (error) {
      console.error('Error updating feature flag:', error);
      return false;
    }

    // Clear cache for this flag
    flagCache.clearFlag(flagKey);
    return true;
  } catch (error: unknown) {
    console.error('Failed to update feature flag:', error);
    return false;
  }
}

/**
 * Create a user-specific override (admin function)
 */
export async function createUserOverride(
  userId: string,
  flagKey: string,
  isEnabled: boolean,
  reason?: string,
  expiresAt?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_flag_overrides')
      .upsert({
        user_id: userId,
        flag_key: flagKey,
        is_enabled: isEnabled,
        reason,
        expires_at: expiresAt
      });

    if (error) {
      console.error('Error creating user override:', error);
      return false;
    }

    return true;
  } catch (error: unknown) {
    console.error('Failed to create user override:', error);
    return false;
  }
}

/**
 * Get feature flag analytics (admin function)
 */
export async function getFeatureFlagAnalytics(
  flagKey?: string,
  startDate?: string,
  endDate?: string
): Promise<unknown[]> {
  try {
    let query = supabase
      .from('feature_flag_analytics')
      .select('*')
      .order('created_at', { ascending: false });

    if (flagKey) {
      query = query.eq('flag_key', flagKey);
    }

    if (startDate) {
      query = query.gte('created_at', startDate);
    }

    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data, error } = await query.limit(1000);

    if (error) {
      console.error('Error fetching analytics:', error);
      return [];
    }

    return data || [];
  } catch (error: unknown) {
    console.error('Failed to fetch analytics:', error);
    return [];
  }
}

/**
 * Generate consistent hash for user + flag combination
 */
async function generateUserFlagHash(userId: string, flagKey: string): Promise<number> {
  const text = `${userId}-${flagKey}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);

  // Convert first 4 bytes to number
  let hash = 0;
  for (let i = 0; i < 4; i++) {
    hash = (hash << 8) + hashArray[i];
  }

  return Math.abs(hash);
}

/**
 * React hook for feature flags
 */
export function useFeatureFlag(flagKey: string): [boolean, boolean] {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkFlag = async () => {
      try {
        const enabled = await isFeatureEnabled(flagKey);
        if (isMounted) {
          setIsEnabled(enabled);
          setIsLoading(false);
        }
      } catch (error: unknown) {
        console.error('Error in useFeatureFlag:', error);
        if (isMounted) {
          setIsEnabled(false);
          setIsLoading(false);
        }
      }
    };

    checkFlag();

    return () => {
      isMounted = false;
    };
  }, [flagKey]);

  return [isEnabled, isLoading];
}

/**
 * Clear the feature flag cache
 */
export function clearFeatureFlagCache(): void {
  flagCache.clear();
}

// Known feature flag keys for type safety
export const FEATURE_FLAGS = {
  PRODUCT_CROSS_CHECK: 'product_cross_check',
  LABOUR_CALENDAR_VIEW: 'labour_calendar_view',
  DATABASE_DRIVEN_PRODUCTS: 'database_driven_products',
  DASHBOARD_ANALYTICS: 'dashboard_analytics',
  AI_QUOTE_PARSING: 'ai_quote_parsing',
  QUOTE_DATABASE_PERSISTENCE: 'quote_database_persistence',
  EXPERIMENTAL_PLANNING_ENGINE: 'experimental_planning_engine',
  BETA_FLOOR_PLANNER: 'beta_floor_planner',
  ADVANCED_LABOUR_TRACKING: 'advanced_labour_tracking',
  COST_OPTIMIZATION: 'cost_optimization'
} as const;

// Type for feature flag keys
export type FeatureFlagKey = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];