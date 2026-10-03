import { test as base, expect, type Page } from "@playwright/test";

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

/** The template's section panel (the app rail is the page's other navigation). */
export const sectionsPanel = (page: Page) => page.getByRole("navigation", { name: "Sections and items" });

/** Open an item from the panel, opening its section first if it's closed. */
export async function openItem(page: Page, section: string, item: string) {
  const panel = sectionsPanel(page);
  const toggle = panel.getByRole("button", { name: section, exact: true });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  await panel.getByRole("button", { name: new RegExp(`^${item}`) }).click();
}
