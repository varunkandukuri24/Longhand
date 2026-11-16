import { expect, test } from "@playwright/test";

test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": `198.51.100.${150 + Math.floor(Math.random() * 50)}`,
  },
});

test("first-visit intro shows, focuses the caret, and stays gone after typing", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    try {
      window.localStorage.removeItem("lh_intro_seen");
    } catch {
      /* ignore */
    }
  });
  await page.reload();

  const textarea = page.getByRole("textbox", { name: "Writing page" });
  await expect(textarea).toBeFocused({ timeout: 15_000 });
  await expect(page.getByText("Prove you write it, not AI")).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByText("Start typing. No account needed."),
  ).toBeVisible();

  await textarea.press("a");
  await expect(page.getByText("Prove you write it, not AI")).toHaveCount(0, {
    timeout: 5_000,
  });

  await page.reload();
  await expect(textarea).toBeFocused({ timeout: 15_000 });
  await expect(page.getByText("Prove you write it, not AI")).toHaveCount(0);
});

test("phone layout has no horizontal scroll and receipt card clears the caret", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.evaluate(() => {
    try {
      window.localStorage.removeItem("lh_intro_seen");
    } catch {
      /* ignore */
    }
  });
  await page.reload();

  const textarea = page.getByRole("textbox", { name: "Writing page" });
  await expect(textarea).toBeFocused({ timeout: 15_000 });
  await expect(page.getByText("Prove you write it, not AI")).toBeVisible({
    timeout: 10_000,
  });

  const overflowX = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(overflowX).toBe(false);

  const created = page.waitForResponse(
    (res) =>
      res.url().includes("/api/guest/pieces") &&
      res.request().method() === "POST",
  );
  const words = Array.from({ length: 25 }, (_, i) => `word${i}`).join(" ");
  await textarea.fill(words);
  expect((await created).ok()).toBe(true);

  await expect(page.getByText("YOUR RECEIPT SO FAR")).toBeVisible({
    timeout: 10_000,
  });

  const clearance = await page.evaluate(() => {
    const card = document.querySelector(".guest-receipt");
    const area = document.querySelector(
      'textarea[aria-label="Writing page"]',
    ) as HTMLTextAreaElement | null;
    if (!card || !area) return null;
    const cardRect = card.getBoundingClientRect();
    const areaRect = area.getBoundingClientRect();
    return areaRect.bottom < cardRect.top || cardRect.top > areaRect.top;
  });
  expect(clearance).toBe(true);
});
