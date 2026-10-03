"use client";

import { isAuthError } from "@supabase/supabase-js";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { safeNext, useAuth } from "@/lib/auth";

import { PageMessage, RetryButton } from "./States";
import { ui } from "./styles";

type Mode = "sign-in" | "sign-up";

const COPY: Record<Mode, { title: string; intro: string; submit: string; busy: string }> = {
  "sign-in": {
    title: "Sign in",
    intro: "Use the email and password you created your account with.",
    submit: "Sign in",
    busy: "Signing in…",
  },
  "sign-up": {
    title: "Create your account",
    intro: "Anyone can create an account. Everyone who signs in works on the same templates.",
    submit: "Create account",
    busy: "Creating your account…",
  },
};

/** Sign in or create an account with email and password (SPEC.md US8). */
export function LoginScreen() {
  const auth = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    if (auth.status === "signed-in") router.replace(next);
  }, [auth.status, next, router]);

  if (auth.status === "unavailable") {
    return (
      <PageMessage title="Sign-in isn't available right now" action={<RetryButton onRetry={auth.retry} />}>
        The app couldn&apos;t load its sign-in settings. Check your connection and try again.
      </PageMessage>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (auth.status !== "signed-out") return;
    setBusy(true);
    setError(undefined);
    setNotice(undefined);
    const credentials = { email: email.trim(), password };
    const result =
      mode === "sign-in"
        ? await auth.client.auth.signInWithPassword(credentials)
        : await auth.client.auth.signUp({
            ...credentials,
            options: { emailRedirectTo: `${window.location.origin}/login/` },
          });
    setBusy(false);
    if (result.error) return setError(describe(result.error));
    // With "Confirm email" on, Supabase creates the account but only signs in after the link is opened.
    if (mode === "sign-up" && !result.data.session) {
      setNotice(`Check ${credentials.email} for a confirmation link, then come back and sign in.`);
      setMode("sign-in");
    }
    // Otherwise the session arrives through the auth provider and the effect above moves on.
  }

  function switchTo(target: Mode) {
    setMode(target);
    setError(undefined);
    setNotice(undefined);
  }

  const copy = COPY[mode];
  return (
    <main className="flex min-h-screen w-full items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-6 flex items-center justify-center gap-2 text-sm font-semibold text-ink">
          <span aria-hidden className="flex size-7 items-center justify-center rounded-control bg-accent text-white">
            S
          </span>
          Spectora template importer
        </p>
        <section aria-labelledby="sign-in-heading" className={`p-8 ${ui.card}`}>
          <h1 id="sign-in-heading" className="text-xl font-bold tracking-tight text-ink">
            {copy.title}
          </h1>
          <p className="mt-1 text-sm text-muted">{copy.intro}</p>
          <form className="mt-6 space-y-4" onSubmit={submit}>
            <Field label="Email" htmlFor="email">
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={`w-full ${ui.input}`}
              />
            </Field>
            <Field label="Password" htmlFor="password" hint={mode === "sign-up" ? "At least 6 characters." : undefined}>
              <input
                id="password"
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                required
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby={mode === "sign-up" ? "password-hint" : undefined}
                className={`w-full ${ui.input}`}
              />
            </Field>
            {error && (
              <p role="alert" className="text-sm font-medium text-danger">
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className="text-sm font-medium text-success">
                {notice}
              </p>
            )}
            <button type="submit" disabled={busy || auth.status !== "signed-out"} className={`w-full ${ui.primary}`}>
              {busy ? copy.busy : copy.submit}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-muted">
            {mode === "sign-in" ? "New here? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => switchTo(mode === "sign-in" ? "sign-up" : "sign-in")}
              className={ui.link}
            >
              {mode === "sign-in" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </section>
      </div>
    </main>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-meta">
          {hint}
        </p>
      )}
    </div>
  );
}

/** Supabase's reasons, in the inspector's words, with what to do next. */
function describe(error: unknown): string {
  if (!isAuthError(error)) return "Something went wrong. Try again.";
  switch (error.code) {
    case "invalid_credentials":
      return "That email and password don't match. Check them, or create an account.";
    case "user_already_exists":
    case "email_exists":
      return "There's already an account with that email. Sign in instead.";
    case "email_not_confirmed":
      return "Confirm your email first: open the link we sent you, then sign in.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Wait a minute, then try again.";
    case "signup_disabled":
      return "New accounts are turned off. Ask the owner for access.";
    case "email_address_invalid":
      return "That email address isn't valid. Check it and try again.";
  }
  if (error.name === "AuthRetryableFetchError") {
    return "Couldn't reach the sign-in service. Check your connection and try again.";
  }
  return error.message || "Something went wrong. Try again.";
}
