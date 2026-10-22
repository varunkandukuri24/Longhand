import { expect, test } from "@playwright/test";

test("a refused guest create opens Sign in to keep writing and does not change the bar", async ({
  page,
}) => {
  await page.route("**/api/guest/pieces", async (route) => {
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ error: "guest_create_limit" }),
    });
  });

  await page.goto("/");
  const textarea = page.getByRole("textbox", { name: "Writing page" });
  await expect(textarea).toBeFocused({ timeout: 15_000 });
  await page.keyboard.type("Hi");

  await expect(
    page.getByRole("heading", { name: "Sign in to keep writing" }),
  ).toBeVisible({ timeout: 10_000 });
  await expect(
    page.getByText(
      "Too many new pages have been started from this network today. Sign in and you can write as much as you like.",
    ),
  ).toBeVisible();
  await expect(page.locator("[data-editor-bar]")).not.toContainText(
    "Too many new pages from this network today",
  );

  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Sign in to keep writing" }),
  ).toHaveCount(0);
  await expect(textarea).toHaveAttribute("readonly", "");

  await page.keyboard.type("x");
  await expect(
    page.getByRole("heading", { name: "Sign in to keep writing" }),
  ).toBeVisible();
});
