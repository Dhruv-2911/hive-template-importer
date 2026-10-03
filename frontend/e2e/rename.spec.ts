import { expect, test } from "./fixtures";

import { RESIDENTIAL_EXPORT, importViaApi } from "./exports";

// Each test edits its own fresh import, so tests never depend on each other's edits.
async function freshTemplate(request: Parameters<typeof importViaApi>[0]) {
  return (await importViaApi(request, RESIDENTIAL_EXPORT)).body.template_id as string;
}

test("a renamed section is saved, marked as edited, and survives a reload", async ({ page, request }) => {
  await page.goto(`/template/?id=${await freshTemplate(request)}`);
  await page.getByRole("navigation").getByRole("button", { name: /^Coverings/ }).click();

  await page.getByRole("button", { name: "Rename section “Roof”" }).click();
  await page.getByRole("textbox", { name: "Section name" }).fill("Roof & Gutters");
  await page.getByRole("textbox", { name: "Section name" }).press("Enter");

  await expect(page.getByRole("navigation")).toContainText("Roof & Gutters");
  await page.reload();
  await expect(page.getByRole("navigation")).toContainText("Roof & Gutters");
  await page.getByRole("button", { name: "Show original" }).click();
  await expect(page.getByText("Imported as “Roof”")).toBeVisible();
});

test("renaming one of two same-named comments leaves the other alone", async ({ page, request }) => {
  await page.goto(`/template/?id=${await freshTemplate(request)}&row=263`);
  const first = page.locator("#row-263");

  await first.getByRole("button", { name: "Rename comment “Damper Inoperable”" }).click();
  await first.getByRole("textbox", { name: "Comment name" }).fill("Damper won't open");
  await first.getByRole("textbox", { name: "Comment name" }).press("Enter");

  await expect(first.getByRole("heading", { name: "Damper won't open" })).toBeVisible();
  await expect(page.locator("#row-264").getByRole("heading", { name: "Damper Inoperable" })).toBeVisible();
  await page.reload();
  await expect(page.locator("#row-263").getByRole("heading", { name: "Damper won't open" })).toBeVisible();
});

test("Escape cancels a rename without saving anything", async ({ page, request }) => {
  await page.goto(`/template/?id=${await freshTemplate(request)}`);
  const patches: string[] = [];
  page.on("request", (r) => r.method() === "PATCH" && patches.push(r.url()));

  await page.getByRole("button", { name: "Rename item “General”" }).click();
  await page.getByRole("textbox", { name: "Item name" }).fill("Something else");
  await page.getByRole("textbox", { name: "Item name" }).press("Escape");

  await expect(page.getByRole("heading", { level: 2, name: "General" })).toBeVisible();
  expect(patches).toEqual([]);
});

test("a blank name is refused and the inspector can keep editing", async ({ page, request }) => {
  await page.goto(`/template/?id=${await freshTemplate(request)}`);

  await page.getByRole("button", { name: "Rename item “General”" }).click();
  await page.getByRole("textbox", { name: "Item name" }).fill("   ");
  await page.getByRole("textbox", { name: "Item name" }).press("Enter");

  await expect(page.getByRole("alert").filter({ hasText: "can't be empty" })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Item name" })).toBeVisible();
});

test("a renamed template shows its new name in the list", async ({ page, request }) => {
  await page.goto(`/template/?id=${await freshTemplate(request)}`);

  await page.getByRole("button", { name: /^Rename template/ }).click();
  await page.getByRole("textbox", { name: "Template name" }).fill("Residential (renamed in e2e)");
  await page.getByRole("textbox", { name: "Template name" }).press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Residential (renamed in e2e)" })).toBeVisible();

  await page.goto("/templates/");
  await expect(page.getByRole("link", { name: "Residential (renamed in e2e)" })).toBeVisible();
});
