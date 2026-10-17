import { expect, test } from "@playwright/test";

/**
 * Back arrow on pieces opened from a writer's subdomain page.
 * Fixture on anon24.localhost:3000 (no auth cookies — signed-out reader).
 */
test.use({ baseURL: "http://anon24.localhost:3000" });

const writerPageHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>anon24</title>
<style>
  body { margin: 0; font-family: Georgia, serif; background: #fff; color: #1c1a16; }
  a { color: inherit; text-decoration: none; }
  .piece { display: block; margin: 48px 0; }
  .piece h2 { font-size: 24px; }
</style>
</head>
<body>
  <h1>anon24</h1>
  <p>1 piece · 52 min of writing · since March 2024</p>
  <a class="piece" href="/some-slug" data-testid="piece-link">
    <h2>Some essay</h2>
    <p>First lines of the piece.</p>
  </a>
</body>
</html>`;

const piecePageHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>Some essay</title>
<style>
  body { margin: 0; font-family: Georgia, serif; background: #fff; color: #1c1a16; }
  .pages-back-arrow {
    position: fixed; top: 28px; left: 40px; z-index: 6;
    width: 44px; height: 44px; display: inline-flex;
    align-items: center; justify-content: center;
    color: #736c61; text-decoration: none;
  }
  .pages-back-arrow[data-tooltip]::after {
    content: attr(data-tooltip);
    position: absolute; top: calc(100% + 6px); left: 0;
    font: 12px monospace; white-space: nowrap;
  }
</style>
</head>
<body>
  <a
    href="/"
    aria-label="Back to anon24"
    data-tooltip="Back to anon24"
    data-pages-back
    data-testid="writer-back"
    class="pages-back-arrow icon-btn"
  >
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M11 4 L5 9 L11 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </a>
  <article style="padding: 56px 40px;">
    <h1>Some essay</h1>
    <p>Body of the piece.</p>
  </article>
</body>
</html>`;

test("piece opened from a writer's page has a back arrow to that page (signed out)", async ({
  page,
  context,
}) => {
  await context.clearCookies();
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.route("http://anon24.localhost:3000/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path === "/" || path === "") {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: writerPageHtml,
      });
      return;
    }
    if (path === "/some-slug") {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: piecePageHtml,
      });
      return;
    }
    await route.fulfill({ status: 404, body: "not found" });
  });

  await page.goto("http://anon24.localhost:3000/");
  await expect(page.getByRole("heading", { name: "anon24" })).toBeVisible();

  await page.getByTestId("piece-link").click();
  await expect(page).toHaveURL("http://anon24.localhost:3000/some-slug");

  const back = page.getByTestId("writer-back");
  await expect(back).toBeVisible();
  await expect(back).toHaveAttribute("aria-label", "Back to anon24");
  await expect(back).toHaveAttribute("data-tooltip", "Back to anon24");
  await expect(back).toHaveAttribute("href", "/");

  // Signed out: no session cookie on the subdomain origin.
  const cookies = await context.cookies("http://anon24.localhost:3000");
  expect(
    cookies.some((c) => c.name.includes("session") || c.name.includes("auth")),
  ).toBe(false);

  await back.click();
  await expect(page).toHaveURL("http://anon24.localhost:3000/");
  await expect(page.getByRole("heading", { name: "anon24" })).toBeVisible();
});
