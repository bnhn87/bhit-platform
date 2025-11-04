import { createClient, SupabaseClient as _SupabaseClient } from "@supabase/supabase-js";

// Use placeholder values during build if env vars are missing
// This allows the build to succeed while throwing runtime errors when actually used
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

const isMissingConfig = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Don't use strict Database type to allow querying any table
export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'bhit-auth-token'
  },
  global: {
    headers: {
      'X-Client-Info': 'bhit-work-os',
      ...(isMissingConfig && {
        'X-Config-Warning': 'Missing Supabase configuration'
      })
    }
  }
});

// Helper function for handling Supabase errors
export const handleSupabaseError = (error: unknown) => {
  return {
    success: false,
    error: (error as { message?: string })?.message || 'An unexpected error occurred',
    details: error as Record<string, unknown>
  };
};

// Helper function for successful responses
export const handleSupabaseSuccess = <T>(data: T) => ({
  success: true,
  data,
  error: undefined
});