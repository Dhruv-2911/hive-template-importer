"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { api, configureApiAuth, type AuthConfig } from "./api";

// Sign-in with Supabase Auth (SPEC.md US8, ADR-009). The browser talks to Supabase directly; the API checks the token.

export type Auth =
  | { status: "loading" }
  | { status: "unavailable"; retry: () => void }
  | { status: "signed-out"; client: SupabaseClient }
  | { status: "signed-in"; client: SupabaseClient; session: Session };

const AuthContext = createContext<Auth>({ status: "loading" });

export function useAuth(): Auth {
  return useContext(AuthContext);
}

let shared: { url: string; client: SupabaseClient } | undefined;

/** One client per page load, so every part of the app sees the same session. */
function clientFor(config: AuthConfig): SupabaseClient {
  if (shared?.url !== config.supabase_url) {
    shared = { url: config.supabase_url, client: createClient(config.supabase_url, config.supabase_publishable_key) };
  }
  return shared.client;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  // The URL and publishable key come from the API at runtime, so one build serves every environment.
  const config = useQuery({ queryKey: ["auth-config"], queryFn: api.authConfig, staleTime: Infinity });
  const [session, setSession] = useState<{ client: SupabaseClient; session: Session | null }>();

  useEffect(() => {
    if (!config.data) return;
    const client = clientFor(config.data);
    configureApiAuth({
      token: async () => (await client.auth.getSession()).data.session?.access_token,
      onUnauthorized: () => void client.auth.signOut({ scope: "local" }),
    });
    // Fires at once with the stored session (INITIAL_SESSION), then on every sign-in, refresh and sign-out.
    const { data } = client.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_OUT") queryClient.clear(); // nothing from the last session stays on screen
      setSession({ client, session: next });
    });
    return () => data.subscription.unsubscribe();
  }, [config.data, queryClient]);

  let auth: Auth = { status: "loading" };
  if (config.isError) auth = { status: "unavailable", retry: () => void config.refetch() };
  else if (session?.session) auth = { status: "signed-in", client: session.client, session: session.session };
  else if (session) auth = { status: "signed-out", client: session.client };
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

/** Where to go after signing in: only a path on this site, never another origin (no open redirect). */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next.startsWith("/login") ? "/" : next;
}
