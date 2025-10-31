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
      setUserId(uid);

      if (!uid) {
        setRole("guest");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("role")
        .eq("id", uid)
        .maybeSingle();

      if (error) {
        // useUserRole: users select error
        setRole("guest");
        return;
      }

      const r = (data?.role as UserRole) || "guest";
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