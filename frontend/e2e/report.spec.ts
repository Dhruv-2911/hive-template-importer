import { expect, test } from "./fixtures";

import { RESIDENTIAL_EXPORT, importViaApi } from "./exports";

test.describe("the report for a successful import", () => {
  let runId: string;

  test.beforeAll(async ({ request }) => {
    runId = (await importViaApi(request, RESIDENTIAL_EXPORT)).body.import_run_id;
  });

  test("says every comment was saved and matches the file", async ({ page }) => {
    await page.goto(`/import/?id=${runId}`);

    await expect(page.getByRole("status").filter({ hasText: "match the file" })).toContainText(
      "All 366 comments were saved and match the file",
    );
    const counts = page.getByRole("region", { name: "What came in" });
    await expect(counts).toContainText("12");
    await expect(counts).toContainText("63");
    await expect(counts).toContainText("279");
  });

  test("lists what needs a look, with links that open the comment", async ({ page }) => {
    await page.goto(`/import/?id=${runId}`);
    const notices = page.getByRole("region", { name: /Needs a look/ });

    await expect(notices.getByRole("link", { name: /Row 263/ })).toBeVisible();
    await expect(notices.getByRole("link", { name: /Row 264/ })).toBeVisible();
    await notices.getByRole("link", { name: /Row 311/ }).click();

    await page.waitForURL(/\/template\/\?id=.+&row=311/);
    await expect(page.locator("#row-311")).toBeInViewport();
  });

  test("shows the columns kept but not editable, and what Spectora doesn't export", async ({ page }) => {
    await page.goto(`/import/?id=${runId}`);

    const kept = page.getByRole("region", { name: "Kept but not editable" });
    await expect(kept.getByRole("row", { name: /Default Value/ }).first()).toContainText("1");
    const missing = page.getByRole("region", { name: "Not in Spectora's export" });
    await expect(missing).toContainText("Severity labels");
    // The download goes through the API with the token, and saves the original file under its own name.
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download original file" }).click();
    expect((await download).suggestedFilename()).toBe("InterNACHI Residential -2026-09-28.xls");
  });
});

test("the report for a refused upload says why", async ({ page, request }) => {
  const refused = await importViaApi(request, { name: "notes.txt", buffer: Buffer.from("not a spreadsheet") });
  expect(refused.status).toBe(422);

  await page.goto(`/import/?id=${refused.body.error.details.import_run_id}`);

  const reason = page.getByRole("alert").filter({ hasText: "wasn't imported" });
  await expect(reason).toContainText("isn't a spreadsheet");
  await expect(page.getByRole("link", { name: "Open template" })).toHaveCount(0);
});
