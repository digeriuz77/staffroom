"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

interface AuthContextValue {
  session: Session | null;
  userId: string | null;
  loading: boolean;
  enabled: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  userId: null,
  loading: false,
  enabled: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => ({ error: "Auth not configured" }),
  signOut: async () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<SupabaseClient<Database> | null>(null);

  useEffect(() => {
    let sub: { unsubscribe: () => void } | undefined;
    (async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !anon) {
        setLoading(false);
        return;
      }
      const { createClient } = await import("@supabase/supabase-js");
      const c = createClient<Database>(url, anon);
      setClient(c);
      const { data } = await c.auth.getSession();
      setSession(data.session);
      setLoading(false);
      const { data: listener } = c.auth.onAuthStateChange((_e, s) => setSession(s));
      sub = listener.subscription;
    })();
    return () => sub?.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      userId: session?.user?.id ?? null,
      loading,
      enabled: Boolean(client),
      signInWithGoogle: async () => {
        if (!client) return;
        const redirectTo = typeof window !== "undefined" ? `${window.location.origin}` : undefined;
        const { error } = await client.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo,
          },
        });
        if (error) {
          console.error("Google sign in error:", error.message);
        }
      },
      signInWithEmail: async (email) => {
        if (!client) return { error: "Auth not configured" };
        const { error } = await client.auth.signInWithOtp({ email });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        if (!client) return;
        await client.auth.signOut();
        setSession(null);
      },
    }),
    [session, loading, client],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
