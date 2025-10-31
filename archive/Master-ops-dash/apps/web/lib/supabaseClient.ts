import { createClient } from "@supabase/supabase-js";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.warn("[supabaseClient] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}
export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
