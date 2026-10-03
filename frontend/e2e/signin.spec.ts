import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";

import { INSPECTOR, mockSupabaseAuth } from "./auth";

// SPEC.md US8: the whole app sits behind sign-in (ADR-009).

async function signIn(page: Page, password = "a good password") {
  await page.getByLabel("Email").fill(INSPECTOR.email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("a visitor is sent to sign in, then back to the page they asked for", async ({ page }) => {
    await mockSupabaseAuth(page);
    await page.goto("/templates/");

    await expect(page).toHaveURL(/\/login\/\?next=%2Ftemplates%2F$/);
    await signIn(page);

    await expect(page).toHaveURL(/\/templates\/$/);
    await expect(page.getByRole("heading", { level: 1, name: "Templates" })).toBeVisible();
  });

  test("a wrong password is refused with what to do next", async ({ page }) => {
    await mockSupabaseAuth(page, {
      signIn: () => ({ status: 400, body: { error_code: "invalid_credentials", msg: "Invalid login credentials" } }),
    });
    await page.goto("/login/");

    await signIn(page, "the wrong password");

    // Next's route announcer is also role=alert, so find ours by its text.
    await expect(page.getByRole("alert").filter({ hasText: "don't match" })).toHaveText(
      "That email and password don't match. Check them, or create an account.",
    );
    await expect(page).toHaveURL(/\/login\/$/);
  });

  test("creating an account signs straight in when no confirmation is needed", async ({ page, baseURL }) => {
    const seen = await mockSupabaseAuth(page);
    await page.goto("/login/");

    await page.getByRole("button", { name: "Create an account" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
    await page.getByLabel("Email").fill(INSPECTOR.email);
    await page.getByLabel("Password").fill("a good password");
    await page.getByRole("button", { name: "Create account" }).click();

    // Opens on the sample template's overview (US7).
    await expect(page).toHaveURL(/\/template\/\?id=/);
    // A confirmation link, when the project sends one, brings the inspector back to sign-in on this site.
    const back = encodeURIComponent(`${new URL(baseURL!).origin}/login/`);
    expect(seen).toContain(`POST /auth/v1/signup?redirect_to=${back}`);
  });

  test("creating an account asks to confirm the email when the project requires it", async ({ page }) => {
    await mockSupabaseAuth(page, {
      // With "Confirm email" on, Supabase returns the new user but no session.
      signUp: ({ email }) => ({ status: 200, body: { id: INSPECTOR.id, email, aud: "authenticated", identities: [{}] } }),
    });
    await page.goto("/login/");

    await page.getByRole("button", { name: "Create an account" }).click();
    await page.getByLabel("Email").fill(INSPECTOR.email);
    await page.getByLabel("Password").fill("a good password");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("status")).toHaveText(
      `Check ${INSPECTOR.email} for a confirmation link, then come back and sign in.`,
    );
    await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toBeVisible();
  });

  test("the next page can only be on this site", async ({ page, baseURL }) => {
    await mockSupabaseAuth(page);
    await page.goto("/login/?next=https://example.com/");

    await signIn(page);

    await expect(page).toHaveURL(/\/template\/\?id=/);
    expect(new URL(page.url()).origin).toBe(new URL(baseURL!).origin);
  });

  test("the API refuses data without a token, and health stays public", async ({ playwright, baseURL }) => {
    const anonymous = await playwright.request.newContext({ baseURL });
    const templates = await anonymous.get("/api/templates");
    expect(templates.status()).toBe(401);
    expect((await templates.json()).error.code).toBe("AUTH_REQUIRED");

    expect((await anonymous.get("/api/health")).status()).toBe(200);
    expect((await anonymous.get("/api/auth/config")).status()).toBe(200);
    await anonymous.dispose();
  });
});

test("signing out returns to sign-in and protects the app again", async ({ page }) => {
  const seen = await mockSupabaseAuth(page);
  await page.goto("/templates/");
  await expect(page.getByText(INSPECTOR.email)).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();

  await expect(page).toHaveURL(/\/login\//);
  expect(seen).toContain("POST /auth/v1/logout?scope=local");
  await page.goto("/templates/");
  await expect(page).toHaveURL(/\/login\//);
});

test("an expired session on the server signs the browser out", async ({ page }) => {
  await mockSupabaseAuth(page);
  // The API says the token is no longer valid, as it would after the session was revoked.
  await page.route("**/api/templates", (route) =>
    route.fulfill({ status: 401, json: { error: { code: "AUTH_REQUIRED", message: "Sign in to continue.", details: {} } } }),
  );

  await page.goto("/templates/");

  await expect(page).toHaveURL(/\/login\/\?next=%2Ftemplates%2F$/);
});
