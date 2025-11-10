// apps/web/lib/AuthProvider.tsx
import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { supabase } from "./supabaseClient";

type AuthCtx = {
  ready: boolean;
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
};

const defaultContext: AuthCtx = {
  ready: false,
  user: null,
  session: null,
  loading: false,
  error: null,
  signOut: async () => {},
  signIn: async () => ({ success: false, error: 'Not initialized' }),
  signUp: async () => ({ success: false, error: 'Not initialized' })
};

const Ctx = createContext<AuthCtx>(defaultContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.auth.getSession();
        if (!alive) return;
        
        if (error) {
          // Auth session error
          setError(error.message);
        } else {
          setSession(data.session ?? null);
          setUser(data.session?.user ?? null);
          setError(null);
        }
        setReady(true);
      } catch (err: unknown) {
        // Auth initialization error
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage || 'Failed to initialize authentication');
      } finally {
        setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess ?? null);
      setUser(sess?.user ?? null);
      setReady((prev) => prev || true);
      setError(null); // Clear errors on auth state change
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signOut(): Promise<void> {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signOut();
      if (error) {
        setError(error.message);
        // Sign out error
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const message = errorMessage || 'Failed to sign out';
      setError(message);
      // Sign out exception
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const message = errorMessage || 'Failed to sign in';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }

  async function signUp(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        setError(error.message);
        return { success: false, error: error.message };
      }
      
      return { success: true };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      const message = errorMessage || 'Failed to sign up';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }

  const value = useMemo(() => ({ 
    ready, 
    user, 
    session, 
    loading, 
    error, 
    signOut, 
    signIn, 
    signUp 
  }), [ready, user, session, loading, error]);
  
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuthCtx() {
  return useContext(Ctx);
}
