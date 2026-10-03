import { expect, openItem, sectionsPanel, test, type Page } from "./fixtures";

import { RESIDENTIAL_EXPORT } from "./exports";

// The walkthrough's story end to end, through the UI only: upload, check, edit, reload, duplicate, and show the
// copy is independent of the original (SPEC.md success criteria 1, 4 and 5).

async function renameSection(page: Page, from: string, to: string) {
  await page.getByRole("button", { name: `Rename section “${from}”` }).click();
  await page.getByRole("textbox", { name: "Section name" }).fill(to);
  await page.getByRole("textbox", { name: "Section name" }).press("Enter");
  await expect(sectionsPanel(page)).toContainText(to);
}

test("upload → verify → edit → reload → duplicate → change the copy → the original is unchanged", async ({ page }) => {
  // Upload, and the report proves every comment arrived.
  await page.goto("/upload/");
  await page.getByLabel("Choose a Spectora export").setInputFiles(RESIDENTIAL_EXPORT);
  await expect(page.getByRole("status").filter({ hasText: "match the file" })).toContainText(
    "All 366 comments were saved and match the file",
  );
  await page.getByRole("link", { name: "Open template" }).click();
  await page.waitForURL(/\/template\/\?id=/);
  const originalId = new URL(page.url()).searchParams.get("id");

  // Edit a section name and a comment's text; both survive a reload.
  await openItem(page, "Roof", "Coverings");
  await renameSection(page, "Roof", "Roof & Gutters");
  await page.goto(`/template/?id=${originalId}&row=12`);
  const comment = page.locator("#row-12");
  await comment.getByRole("button", { name: "Edit text" }).click();
  await comment.getByRole("textbox", { name: "Comment text" }).click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("Siding is letting water in. Recommend a siding contractor.");
  await comment.getByRole("button", { name: "Save text" }).click();
  await expect(comment).toContainText("Siding is letting water in.");
  await page.reload();
  await expect(sectionsPanel(page)).toContainText("Roof & Gutters");
  await expect(page.locator("#row-12")).toContainText("Siding is letting water in.");

  // Duplicate, then change the copy.
  await page.getByRole("button", { name: "Duplicate" }).click();
  await page.waitForURL((url) => !!url.searchParams.get("id") && url.searchParams.get("id") !== originalId);
  await openItem(page, "Roof & Gutters", "Coverings"); // the copy keeps the original's edits
  await renameSection(page, "Roof & Gutters", "Roof (copy only)");

  // The original still has its own edits, and none of the copy's.
  await page.getByRole("link", { name: "Open the original" }).click();
  await page.waitForURL((url) => url.searchParams.get("id") === originalId);
  await expect(sectionsPanel(page)).toContainText("Roof & Gutters");
  await expect(sectionsPanel(page)).not.toContainText("copy only");
  await page.goto(`/template/?id=${originalId}&row=12`);
  await expect(page.locator("#row-12")).toContainText("Siding is letting water in.");
});
