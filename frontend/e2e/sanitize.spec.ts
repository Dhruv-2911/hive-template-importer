import { readFileSync } from "node:fs";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { ALLOWED_ATTR, ALLOWED_TAGS } from "../lib/sanitize";

// The same cases the server's nh3 cleaner is tested against (backend/tests/test_sanitize.py), so the browser's
// DOMPurify allowlist and the server's can't drift apart (ADR-005).
const cases: { name: string; html: string; keep: string[]; drop: string[] }[] = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../backend/tests/fixtures/sanitize_cases.json"), "utf8"),
).cases;

for (const sample of cases) {
  test(`DOMPurify with the app's allowlist: ${sample.name}`, async ({ page }) => {
    await page.goto("/templates/");
    await page.addScriptTag({ path: require.resolve("dompurify/dist/purify.min.js") });

    const cleaned = await page.evaluate(
      ([html, tags, attrs]) =>
        (window as unknown as { DOMPurify: { sanitize: (h: string, o: object) => string } }).DOMPurify.sanitize(
          html as string,
          { ALLOWED_TAGS: tags, ALLOWED_ATTR: attrs },
        ),
      [sample.html, ALLOWED_TAGS, ALLOWED_ATTR] as const,
    );

    for (const fragment of sample.keep) expect(cleaned).toContain(fragment);
    for (const fragment of sample.drop) expect(cleaned).not.toContain(fragment);
  });
}
