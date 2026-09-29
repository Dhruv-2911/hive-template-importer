import { expect, test, type APIRequestContext } from "@playwright/test";

import { RESIDENTIAL_EXPORT, importViaApi } from "./exports";

// Residential rows used here: 12 is simple HTML, 10 is plain text, 311 holds the export's empty video placeholder.
async function freshTemplate(request: APIRequestContext) {
  return (await importViaApi(request, RESIDENTIAL_EXPORT)).body.template_id as string;
}

async function storedComment(request: APIRequestContext, templateId: string, row: number) {
  const tree = await (await request.get(`/api/templates/${templateId}`)).json();
  for (const section of tree.sections)
    for (const item of section.items)
      for (const comment of item.comments) if (comment.source_row === row) return comment;
}

test("edited text is saved, marked as edited, and the original is one click away", async ({ page, request }) => {
  const id = await freshTemplate(request);
  await page.goto(`/template/?id=${id}&row=12`);
  const card = page.locator("#row-12");

  await card.getByRole("button", { name: "Edit text" }).click();
  await card.getByRole("textbox", { name: "Comment text" }).click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("Siding is letting water in.");
  await page.keyboard.press("ControlOrMeta+a"); // select what was typed, then make it bold
  await card.getByRole("button", { name: "Bold" }).click();
  await card.getByRole("button", { name: "Save text" }).click();

  await expect(card.locator("strong")).toHaveText("Siding is letting water in.");
  await page.reload();
  const reloaded = page.locator("#row-12");
  await expect(reloaded).toContainText("Siding is letting water in.");
  await expect(reloaded.getByText("Text edited")).toBeVisible();
  await reloaded.getByRole("button", { name: "Show original text" }).click();
  await expect(reloaded).toContainText("Siding showed signs of water intrusion");
});

test("opening and closing the editor without changes sends nothing", async ({ page, request }) => {
  const id = await freshTemplate(request);
  await page.goto(`/template/?id=${id}&row=10`);
  const card = page.locator("#row-10");
  const patches: string[] = [];
  page.on("request", (r) => r.method() === "PATCH" && patches.push(r.url()));

  await card.getByRole("button", { name: "Edit text" }).click();
  await card.getByRole("button", { name: "Cancel" }).click();
  await card.getByRole("button", { name: "Edit text" }).click();
  await card.getByRole("button", { name: "Save text" }).click();

  await expect(card.getByRole("button", { name: "Edit text" })).toBeVisible();
  expect(patches).toEqual([]);
  const comment = await storedComment(request, id, 10);
  expect(comment.text_html).toBe(comment.source_text_html);
});

test("markup the editor can't show opens as HTML, so nothing is stripped", async ({ page, request }) => {
  const id = await freshTemplate(request);
  await page.goto(`/template/?id=${id}&row=311`);
  const card = page.locator("#row-311");

  await card.getByRole("button", { name: "Edit text" }).click();

  await expect(card.getByRole("note").filter({ hasText: "editing its HTML" })).toBeVisible();
  const html = card.getByRole("textbox", { name: "Comment HTML" });
  await expect(html).toHaveValue(/youtube-embed-wrapper/);
  await html.press("ControlOrMeta+End");
  await html.pressSequentially("<p>Photo in the report.</p>");
  await card.getByRole("button", { name: "Save text" }).click();

  await expect(card).toContainText("Photo in the report.");
  const comment = await storedComment(request, id, 311);
  expect(comment.text_html).toContain("Wall had damage from doorknob.");
  expect(comment.text_html).toContain("Photo in the report.");
});

test("script pasted into the HTML never runs and isn't saved", async ({ page, request }) => {
  const id = await freshTemplate(request);
  await page.goto(`/template/?id=${id}&row=311`);
  const card = page.locator("#row-311");
  const dialogs: string[] = [];
  page.on("dialog", (d) => {
    dialogs.push(d.message());
    d.dismiss();
  });

  await card.getByRole("button", { name: "Edit text" }).click();
  await card
    .getByRole("textbox", { name: "Comment HTML" })
    .fill('<p>Fine.</p><script>alert("script")</script><img src="x" onerror="alert(\'img\')">');
  await card.getByRole("button", { name: "Save text" }).click();

  await expect(card).toContainText("Fine.");
  await page.reload();
  await expect(page.locator("#row-311")).toContainText("Fine.");
  expect(dialogs).toEqual([]);
  const comment = await storedComment(request, id, 311);
  expect(comment.text_html).not.toContain("<script");
  expect(comment.text_html).not.toContain("onerror");
});
