import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type Session = Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"];

export function useRequireAuth(redirectTo: string = "/login") {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSession(data.session);
      if (!data.session) {
        router.replace(redirectTo);
      } else {
        setLoading(false);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!alive) return;
      setSession(newSession);
      if (!newSession) router.replace(redirectTo);
    });
    return () => {
      alive = false;
      sub?.subscription?.unsubscribe();
    };
  }, [router, redirectTo]);

  return { loading, session, user: session?.user ?? null };
}
