import { expect, openItem, sectionsPanel, test } from "./fixtures";

import { RESIDENTIAL_EXPORT, importViaApi } from "./exports";

test("a copy can be changed without touching the original", async ({ page, request }) => {
  const originalId = (await importViaApi(request, RESIDENTIAL_EXPORT)).body.template_id as string;
  await page.goto(`/template/?id=${originalId}`);

  await page.getByRole("button", { name: "Duplicate" }).click();
  await page.waitForURL((url) => !!url.searchParams.get("id") && url.searchParams.get("id") !== originalId);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("InterNACHI Residential -2026-09-28 (copy)");

  await openItem(page, "Roof", "Coverings");
  await page.getByRole("button", { name: "Rename section “Roof”" }).click();
  await page.getByRole("textbox", { name: "Section name" }).fill("Roof (only in the copy)");
  await page.getByRole("textbox", { name: "Section name" }).press("Enter");
  await expect(sectionsPanel(page)).toContainText("Roof (only in the copy)");

  await page.getByRole("link", { name: "Open the original" }).click();
  await page.waitForURL((url) => url.searchParams.get("id") === originalId);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("InterNACHI Residential -2026-09-28");
  await expect(sectionsPanel(page)).not.toContainText("only in the copy");
});

test("the copy shows in the template list, marked as a copy", async ({ page, request }) => {
  const originalId = (await importViaApi(request, RESIDENTIAL_EXPORT)).body.template_id as string;
  await page.goto(`/template/?id=${originalId}`);
  await page.getByRole("button", { name: "Duplicate" }).click();
  await page.waitForURL((url) => url.searchParams.get("id") !== originalId);
  const copyId = new URL(page.url()).searchParams.get("id");

  await page.goto("/templates/");

  const row = page.getByRole("row").filter({ has: page.locator(`a[href="/template/?id=${copyId}"]`) });
  await expect(row).toContainText("(copy)");
  await expect(row).toContainText("Copy");
  await expect(row).toContainText("366 comments");
});
