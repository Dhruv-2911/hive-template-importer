import { defineConfig } from "@playwright/test";

import { JWKS, PUBLISHABLE_KEY, SUPABASE_URL, signedInState } from "./e2e/auth";

// End-to-end tests run against the real Docker image (the same one Render runs), on its own database.
// `npm run e2e` builds the image first. Set E2E_BASE_URL to test an app that is already running instead.
const PORT = 8010;
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: process.env.E2E_BASE_URL ? undefined : "./e2e/teardown.ts",
  timeout: 30_000,
  workers: 1,
  // Every test starts signed in unless it opts out (e2e/signin.spec.ts). Tokens are minted with a test-only key.
  use: { baseURL: BASE_URL, storageState: signedInState(new URL(BASE_URL).origin), trace: "retain-on-failure" },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Playwright stops this with a hard kill that `docker run` can't pass on, so clear any leftover
        // container first; e2e/teardown.ts removes it afterwards.
        // Each run starts from an empty hive_e2e database; the container migrates and seeds it on start.
        command:
          "docker rm -f hive-e2e > /dev/null 2>&1; " +
          "docker compose -f ../docker-compose.yml exec -T db psql -q -U hive -d hive " +
          "-c 'DROP DATABASE IF EXISTS hive_e2e WITH (FORCE)' -c 'CREATE DATABASE hive_e2e OWNER hive'; " +
          `exec docker run --rm --name hive-e2e --network hive_default -p ${PORT}:8000 ` +
          "-e DATABASE_URL=postgresql://hive:hive@db:5432/hive_e2e " +
          // A fake Supabase: the browser's calls to it are mocked, and the API trusts only the test key (ADR-009).
          `-e SUPABASE_URL=${SUPABASE_URL} -e SUPABASE_PUBLISHABLE_KEY=${PUBLISHABLE_KEY} -e SUPABASE_JWKS='${JWKS}' ` +
          "hive-importer",
        url: `http://localhost:${PORT}/api/health`,
        reuseExistingServer: false,
        timeout: 90_000,
      },
});
