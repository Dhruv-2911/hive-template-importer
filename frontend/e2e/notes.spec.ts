import { expect, test } from "@playwright/test";

test("a comment shows its import note where it lives", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL(/\/template\/\?id=/);
  const id = new URL(page.url()).searchParams.get("id");

  await page.goto(`/template/?id=${id}&row=318`);

  const comment = page.locator("#row-318");
  await expect(comment.getByRole("note")).toContainText("embedded video in Spectora");
  await expect(page.locator("#row-320").getByRole("note")).toHaveCount(0);
});

test("the template links to its import report", async ({ page }) => {
  await page.goto("/");
  await page.waitForURL(/\/template\/\?id=/);

  await page.getByRole("link", { name: "Import report" }).click();

  await page.waitForURL(/\/import\/\?id=/);
  await expect(page.getByRole("status").filter({ hasText: "match the file" })).toContainText("All 346 comments");
});
