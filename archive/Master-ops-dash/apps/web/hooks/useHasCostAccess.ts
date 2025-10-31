// apps/web/hooks/useHasCostAccess.ts
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useUserRole } from "./useUserRole";

export function useHasCostAccess() {
  const { role, loading: loadingRole } = useUserRole();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      if (loadingRole) return;
      if (role === "director") {
        if (!cancel) { setAllowed(true); setLoading(false); }
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) { if (!cancel) { setAllowed(false); setLoading(false); } return; }
      const { data, error } = await supabase.from("cost_access").select("user_id").eq("user_id", uid).maybeSingle();
      if (!cancel) {
        setAllowed(!!data && !error);
        setLoading(false);
      }
    })().catch(() => { if (!cancel) { setAllowed(false); setLoading(false); } });
    return () => { cancel = true; };
  }, [role, loadingRole]);

  return { allowed, loading };
}
