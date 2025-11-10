// apps/web/hooks/useHasCostAccess.ts
import { useEffect, useState } from "react";

import { supabase } from "../lib/supabaseClient";

import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";

import { canViewFinancials } from "@/lib/roles";

export function useHasCostAccess() {
  const { user } = useAuth();
  const { role, loading: loadingRole } = useUserRole();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;

    const checkAccess = async () => {
      try {
        setError(null);
        
        if (loadingRole) return;
        
        // Check role-based access first
        if (canViewFinancials(role)) {
          if (!cancel) {
            setAllowed(true);
            setLoading(false);
          }
          return;
        }
        
        // If no user, deny access
        if (!user?.id) {
          if (!cancel) {
            setAllowed(false);
            setLoading(false);
          }
          return;
        }

        // Check explicit cost access permissions
        const { data, error } = await supabase
          .from("cost_access")
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!cancel) {
          if (error) {
            // Cost access check failed
            setError(error.message);
            setAllowed(false);
          } else {
            setAllowed(!!data);
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!cancel) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          setError(errorMessage || 'Failed to check cost access');
          setAllowed(false);
          setLoading(false);
        }
      }
    };

    checkAccess();

    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, loadingRole, user?.id]);

  return { allowed, loading, error };
}
