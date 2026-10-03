import { expect, test } from "./fixtures";

// After a deploy, browsers must not keep showing the previous version's pages (they did once: an old page, from
// before sign-in, called the API without a token). Pages are checked again on every visit; build files are kept.
test("pages are checked again on every visit, and hashed build files are kept", async ({ request }) => {
  const home = await request.get("/");
  expect(home.headers()["cache-control"]).toBe("no-cache");

  const script = (await home.text()).match(/\/_next\/static\/[^"]+\.js/)?.[0];
  expect(script).toBeDefined();
  expect((await request.get(script!)).headers()["cache-control"]).toBe("public, max-age=31536000, immutable");
});
