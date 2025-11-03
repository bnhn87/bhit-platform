import { createClient, SupabaseClient as _SupabaseClient } from "@supabase/supabase-js";

// Lazy initialization to avoid errors during build time
let _supabaseInstance: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (_supabaseInstance) {
    return _supabaseInstance;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      "[supabaseClient] Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  _supabaseInstance = createClient(url, anon, {
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

  return _supabaseInstance;
}

export const supabase = new Proxy({} as ReturnType<typeof createClient>, {
  get: (target, prop) => {
    const client = getSupabaseClient();
    const value = client[prop as keyof typeof client];
    return typeof value === 'function' ? value.bind(client) : value;
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