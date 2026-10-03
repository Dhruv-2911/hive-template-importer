"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useAuth } from "@/lib/auth";

import { AppShell } from "./AppShell";
import { PageMessage, RetryButton } from "./States";

/** Every page except sign-in needs a signed-in user (SPEC.md US8). */
export function AuthGate({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  const onSignInPage = usePathname().startsWith("/login");

  useEffect(() => {
    if (auth.status === "signed-out" && !onSignInPage) {
      // Come back to this exact page (query string included) after signing in.
      const here = window.location.pathname + window.location.search;
      router.replace(`/login/?next=${encodeURIComponent(here)}`);
    }
  }, [auth.status, onSignInPage, router]);

  if (onSignInPage) return children;
  if (auth.status === "unavailable") {
    return (
      <PageMessage title="Sign-in isn't available right now" action={<RetryButton onRetry={auth.retry} />}>
        The app couldn&apos;t load its sign-in settings. Check your connection and try again.
      </PageMessage>
    );
  }
  if (auth.status !== "signed-in") return <PageMessage title="Checking your sign-in…">One moment.</PageMessage>;
  return <AppShell>{children}</AppShell>;
}
