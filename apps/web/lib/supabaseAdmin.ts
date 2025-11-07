import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { Database } from "../types/database";

// Use placeholder values during build if env vars are missing
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

export const supabaseAdmin: SupabaseClient<Database> = createClient(url, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  },
  global: {
    headers: {
      'X-Client-Info': 'bhit-work-os-admin'
    }
  }
});

// Admin-specific helper functions
export const executeAdminQuery = async <T>(
  queryFn: (client: SupabaseClient<Database>) => Promise<unknown>
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const result = await queryFn(supabaseAdmin);
    const resultObj = result as { error?: { message?: string }; data?: T };

    if (resultObj.error) {
      console.error('[Admin Query Error]:', resultObj.error);
      return {
        success: false,
        error: resultObj.error.message || 'Admin query failed'
      };
    }

    return {
      success: true,
      data: resultObj.data
    };
  } catch (error: unknown) {
    console.error('[Admin Query Exception]:', error);
    return {
      success: false,
      error: (error as Error).message || 'An unexpected admin error occurred'
    };
  }
};
