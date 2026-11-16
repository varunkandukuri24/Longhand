import { expect, test } from "@playwright/test";

test.use({
  extraHTTPHeaders: {
    "x-forwarded-for": `198.51.100.${50 + Math.floor(Math.random() * 100)}`,
  },
});

test("the receipt card appears at 25 words and offers sign-in at 50", async ({
  page,
}) => {
  await page.goto("/");
  const textarea = page.getByRole("textbox", { name: "Writing page" });
  await expect(textarea).toBeFocused({ timeout: 15_000 });

  const created = page.waitForResponse(
    (res) =>
      res.url().includes("/api/guest/pieces") &&
      res.request().method() === "POST",
  );
  const words25 = Array.from({ length: 25 }, (_, i) => `word${i}`).join(" ");
  await textarea.fill(words25);
  expect((await created).ok()).toBe(true);
  await page.mouse.move(120, 80);

  await expect(page.getByText("YOUR RECEIPT SO FAR")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText("You wrote this by hand.")).toBeVisible();
  await expect(
    page.getByText("It grows as you write. Publish to put it under your piece."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in to keep it" }),
  ).toHaveCount(0);

  const words50 = Array.from({ length: 50 }, (_, i) => `word${i}`).join(" ");
  await textarea.fill(words50);
  await page.mouse.move(120, 80);

  await expect(
    page.getByText("This isn't saved to an account yet."),
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByRole("button", { name: "Sign in to keep it" }),
  ).toBeVisible();
});
