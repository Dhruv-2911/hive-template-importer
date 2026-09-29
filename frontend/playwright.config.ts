import { defineConfig } from "@playwright/test";

// End-to-end tests run against the real Docker image (the same one Render runs), on its own database.
// `npm run e2e` builds the image first. Set E2E_BASE_URL to test an app that is already running instead.
const PORT = 8010;

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: process.env.E2E_BASE_URL ? undefined : "./e2e/teardown.ts",
  timeout: 30_000,
  workers: 1,
  use: { baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`, trace: "retain-on-failure" },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // Playwright stops this with a hard kill that `docker run` can't pass on, so clear any leftover
        // container first; e2e/teardown.ts removes it afterwards.
        command:
          "docker rm -f hive-e2e > /dev/null 2>&1; " +
          `exec docker run --rm --name hive-e2e --network hive_default -p ${PORT}:8000 ` +
          "-e DATABASE_URL=postgresql://hive:hive@db:5432/hive_e2e hive-importer",
        url: `http://localhost:${PORT}/api/health`,
        reuseExistingServer: false,
        timeout: 90_000,
      },
});
