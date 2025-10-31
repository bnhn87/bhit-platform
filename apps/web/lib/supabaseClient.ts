import { createClient, SupabaseClient as _SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    "[supabaseClient] Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

export const supabase = createClient(url, anon, {
  auth: { 
    persistSession: true, 
    autoRefreshToken: true, 
    detectSessionInUrl: true,
    storageKey: 'bhit-auth-token'
  },
  global: {
    headers: {
      'X-Client-Info': 'bhit-work-os'
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