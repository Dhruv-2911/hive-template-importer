import { expect, sectionsPanel, test, type Page } from "./fixtures";

// SPEC.md US9: search the open template by name or text, in the browser.

async function openSample(page: Page) {
  await page.goto("/");
  await page.waitForURL(/\/template\/\?id=/);
  const box = page.getByRole("combobox", { name: "Search this template" });
  await expect(box).toBeVisible(); // the template has loaded, and with it the Ctrl/⌘+K shortcut
  return box;
}

test("a phrase from a comment's text finds it, and Enter opens it", async ({ page }) => {
  const box = await openSample(page);

  await page.keyboard.press("ControlOrMeta+k");
  await expect(box).toBeFocused();
  await box.fill("damage from doorknob");

  const results = page.getByRole("listbox", { name: "Search results" });
  await expect(page.getByRole("status").filter({ hasText: "match" })).toHaveText("1 match.");
  await expect(results.getByRole("option")).toHaveCount(1);
  await expect(results.getByRole("option")).toContainText("Doorknob Hole");
  await expect(results.getByRole("option")).toContainText("Row 318");
  await box.press("Enter");

  await page.waitForURL(/row=318/);
  await expect(page.locator("#row-318")).toBeInViewport();
  await expect(sectionsPanel(page).getByRole("button", { name: /^Walls/ })).toHaveAttribute("aria-current", "true");
  await expect(results).toBeHidden();
});

test("results come in template order, and the arrow keys choose one", async ({ page }) => {
  const box = await openSample(page);

  await box.fill("general");

  const options = page.getByRole("listbox", { name: "Search results" }).getByRole("option");
  await expect(page.getByRole("status").filter({ hasText: "match" })).toHaveText("12 matches.");
  await expect(options.first()).toContainText("Item in Inspection Details");
  await expect(options.first()).toHaveAttribute("aria-selected", "true");
  await box.press("ArrowDown");
  await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
  await expect(box).toHaveAttribute("aria-activedescendant", (await options.nth(1).getAttribute("id"))!);
});

test("nothing matching is said plainly, and Escape clears the box", async ({ page }) => {
  const box = await openSample(page);

  await box.fill("zzqx");
  await expect(page.getByRole("status").filter({ hasText: "matches" })).toHaveText("Nothing in this template matches “zzqx”.");

  await box.press("Escape");
  await expect(box).toHaveValue("");
});
