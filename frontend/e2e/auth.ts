import { createPrivateKey, sign, type JsonWebKey } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { Page, Route } from "@playwright/test";

// Sign-in for the e2e suite (ADR-009). The container trusts the test-only key in fixtures/ (via SUPABASE_JWKS),
// the tests mint their own tokens with it, and Supabase's auth endpoints are mocked. No test talks to Supabase.

const keyFile = JSON.parse(readFileSync(path.join(__dirname, "fixtures", "test-signing-key.json"), "utf8"));
const privateKey = createPrivateKey({ key: keyFile.private_jwk as JsonWebKey, format: "jwk" });

export const SUPABASE_URL = "http://supabase.e2e.test";
export const PUBLISHABLE_KEY = "sb_publishable_e2e";
export const JWKS = JSON.stringify(keyFile.jwks);
// supabase-js keeps the session under sb-<first label of the Supabase host>-auth-token.
const STORAGE_KEY = "sb-supabase-auth-token";

export const INSPECTOR = { id: "5f0c6a52-0f7b-4a51-9a0e-3d3f2b6f6a10", email: "inspector@example.com" };

const base64url = (value: string | Buffer) => Buffer.from(value).toString("base64url");

export function mintToken(claims: Record<string, unknown> = {}): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "ES256", typ: "JWT", kid: keyFile.private_jwk.kid };
  const payload = {
    iss: `${SUPABASE_URL}/auth/v1`,
    aud: "authenticated",
    sub: INSPECTOR.id,
    email: INSPECTOR.email,
    role: "authenticated",
    is_anonymous: false,
    iat: now,
    exp: now + 3600,
    ...claims,
  };
  const input = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = sign("sha256", Buffer.from(input), { key: privateKey, dsaEncoding: "ieee-p1363" });
  return `${input}.${base64url(signature)}`;
}

/** The session object Supabase returns on sign-in, and supabase-js stores. */
export function supabaseSession(email = INSPECTOR.email) {
  const now = Math.floor(Date.now() / 1000);
  return {
    access_token: mintToken({ email }),
    token_type: "bearer",
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: "e2e-refresh-token",
    user: {
      id: INSPECTOR.id,
      aud: "authenticated",
      role: "authenticated",
      email,
      app_metadata: { provider: "email", providers: ["email"] },
      user_metadata: {},
      identities: [],
      created_at: new Date(now * 1000).toISOString(),
      is_anonymous: false,
    },
  };
}

/** Playwright storage state for a browser that's already signed in. */
export function signedInState(origin: string) {
  return {
    cookies: [],
    origins: [{ origin, localStorage: [{ name: STORAGE_KEY, value: JSON.stringify(supabaseSession()) }] }],
  };
}

type Mock = { status: number; body?: unknown };
type Handlers = { signIn?: (body: { email: string; password: string }) => Mock; signUp?: (body: { email: string }) => Mock };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

/** Stands in for Supabase Auth's sign-in, sign-up and sign-out endpoints. Returns the requests it saw. */
export async function mockSupabaseAuth(page: Page, handlers: Handlers = {}) {
  const seen: string[] = [];
  await page.route(`${SUPABASE_URL}/auth/v1/**`, async (route: Route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const url = new URL(request.url());
    seen.push(`${request.method()} ${url.pathname}${url.search}`);
    const body = request.postDataJSON() ?? {};
    let reply: Mock = { status: 404, body: { error_code: "not_found", msg: "Not mocked" } };
    if (url.pathname.endsWith("/token") && url.searchParams.get("grant_type") === "password") {
      reply = handlers.signIn?.(body) ?? { status: 200, body: supabaseSession(body.email) };
    } else if (url.pathname.endsWith("/signup")) {
      reply = handlers.signUp?.(body) ?? { status: 200, body: supabaseSession(body.email) };
    } else if (url.pathname.endsWith("/logout")) {
      reply = { status: 204 };
    }
    if (reply.body === undefined) return route.fulfill({ status: reply.status, headers: CORS });
    return route.fulfill({ status: reply.status, headers: CORS, json: reply.body });
  });
  return seen;
}
