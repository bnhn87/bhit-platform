import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { useAuth } from "./useAuth";

export function useRequireAuth(redirectTo: string = "/login") {
  const router = useRouter();
  const { ready, session, user, loading: authLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!ready || authLoading) return; // Wait for auth to be ready

    if (!session && !isRedirecting) {
      setIsRedirecting(true);
      router.replace(redirectTo);
      return;
    }

    if (session && isRedirecting) {
      setIsRedirecting(false);
    }
  }, [ready, session, authLoading, router, redirectTo, isRedirecting]);

  const loading = !ready || authLoading || isRedirecting;

  return { 
    loading, 
    session, 
    user,
    isAuthenticated: !!session,
    isRedirecting
  };
}
