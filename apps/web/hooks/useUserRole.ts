// hooks/useUserRole.ts
import { useEffect, useState } from "react";

import { UserRole } from "@/lib/roles";
import { supabase } from "@/lib/supabaseClient";

type UseUserRoleResult = {
  role: UserRole;
  userId: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
};

export function useUserRole(): UseUserRoleResult {
  const [role, setRole] = useState<UserRole>("guest");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id || null;
      console.log('[useUserRole] Auth user ID:', uid);
      setUserId(uid);

      if (!uid) {
        console.log('[useUserRole] No auth user, setting role to guest');
        setRole("guest");
        return;
      }

      // First, let's debug what tables exist and what's in them
      console.log('[useUserRole] Starting role check for user:', uid);

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", uid)
        .maybeSingle();

      console.log('[useUserRole] profiles query result:', {
        data,
        error,
        hasData: !!data,
        roleValue: data?.role,
        typeOfRole: typeof data?.role
      });

      if (error) {
        console.error('[useUserRole] Error fetching from profiles:', error);

        // Try the old users table as fallback for debugging
        const { data: oldData, error: oldError } = await supabase
          .from("users")
          .select("role")
          .eq("account_id", uid)
          .maybeSingle();

        console.log('[useUserRole] Fallback to users table:', {
          oldData,
          oldError,
          hasOldData: !!oldData,
          oldRole: oldData?.role
        });

        setRole("guest");
        return;
      }

      // Convert role to lowercase to handle case inconsistencies
      const rawRole = data?.role;
      const normalizedRole = rawRole ? rawRole.toLowerCase() : null;
      const r = (normalizedRole as UserRole) || "guest";

      console.log('[useUserRole] Final role decision:', {
        rawData: data,
        extractedRole: rawRole,
        normalizedRole: normalizedRole,
        finalRole: r,
        defaultingToGuest: !data?.role
      });
      setRole(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => {
      sub?.subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { role, userId, loading, refresh: load };
}