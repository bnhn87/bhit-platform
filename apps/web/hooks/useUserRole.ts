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

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("account_id", uid)
        .maybeSingle();

      console.log('[useUserRole] Query result:', { data, error });

      if (error) {
        console.error('[useUserRole] Error fetching role:', error);
        setRole("guest");
        return;
      }

      const r = (data?.role as UserRole) || "guest";
      console.log('[useUserRole] Final role:', r);
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