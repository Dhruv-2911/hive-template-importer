import { test as base, expect } from "@playwright/test";

import { mintToken } from "./auth";

/** The tests' own API calls (setup through the API) are signed in, like the browser (ADR-009). */
export const test = base.extend({
  request: async ({ playwright, baseURL }, provide) => {
    const context = await playwright.request.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${mintToken()}` },
    });
    await provide(context);
    await context.dispose();
  },
});

export { expect };
export type { APIRequestContext, Page } from "@playwright/test";
