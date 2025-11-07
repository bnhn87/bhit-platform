// apps/web/lib/server/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

// Use placeholder values during build if env vars are missing
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key';

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
