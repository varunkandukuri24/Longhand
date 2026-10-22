import { expect, test } from "@playwright/test";

test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": `198.51.100.${50 + Math.floor(Math.random() * 100)}`,
  },
});

test("the nudge card appears at 50 words", async ({ page }) => {
  await page.goto("/");
  const textarea = page.getByRole("textbox", { name: "Writing page" });
  await expect(textarea).toBeFocused({ timeout: 15_000 });

  const words = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ");
  const created = page.waitForResponse(
    (res) =>
      res.url().includes("/api/guest/pieces") &&
      res.request().method() === "POST",
  );
  await textarea.fill(words);
  expect((await created).ok()).toBe(true);
  await page.mouse.move(120, 80);

  await expect(page.getByText("Not saved to an account")).toBeVisible({
    timeout: 10_000,
  });
  await expect(
    page.getByRole("button", { name: "Sign in to keep this" }),
  ).toBeVisible();
});
