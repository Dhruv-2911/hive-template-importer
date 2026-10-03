import { expect, test } from "./fixtures";

import { RESIDENTIAL_EXPORT } from "./exports";

test("the templates page lists the sample with its counts", async ({ page }) => {
  await page.goto("/templates/");

  const sample = page.getByRole("row").filter({ hasText: "InterNACHI Commercial Template-2026-09-28" }).filter({ hasText: "Sample" });
  await expect(sample).toContainText("346 comments");
});

test("uploading an export opens its import report", async ({ page }) => {
  await page.goto("/upload/");

  await page.getByLabel("Choose a Spectora export").setInputFiles(RESIDENTIAL_EXPORT);

  await page.waitForURL(/\/import\/\?id=/);
  await expect(page.getByRole("heading", { level: 1, name: "Import report" })).toBeVisible();
  await expect(page.getByText("InterNACHI Residential -2026-09-28.xls")).toBeVisible();
});

test("a file that isn't a spreadsheet is refused with what to do next", async ({ page }) => {
  await page.goto("/upload/");

  await page
    .getByLabel("Choose a Spectora export")
    .setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("not a spreadsheet") });

  // Filtered by text: Next.js adds its own role="alert" route announcer to every page.
  const refusal = page.getByRole("alert").filter({ hasText: "wasn't imported" });
  await expect(refusal).toContainText("isn't a spreadsheet");
  await expect(refusal).toContainText("Export HTML Text");
  await expect(page).toHaveURL(/\/upload\/$/);
});
