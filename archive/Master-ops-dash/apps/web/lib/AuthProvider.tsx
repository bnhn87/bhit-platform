// apps/web/lib/AuthProvider.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

type AuthCtx = {
  ready: boolean;
  user: User | null;
  session: Session | null;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({ ready: false, user: null, session: null, signOut: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setSession(data.session ?? null);
      setUser(data.session?.user ?? null);
      setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess ?? null);
      setUser(sess?.user ?? null);
      // keep ready=true after first hydration
      setReady((prev) => prev || true);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  const value = useMemo(() => ({ ready, user, session, signOut }), [ready, user, session]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuthCtx() {
  return useContext(Ctx);
}
