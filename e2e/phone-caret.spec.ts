import { devices, expect, test, type Page } from "@playwright/test";

const iphone = devices["iPhone 14"];

test.use({
  userAgent: iphone.userAgent,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: iphone.deviceScaleFactor,
  isMobile: iphone.isMobile,
  hasTouch: iphone.hasTouch,
});

async function expectCaretBelowWindow(page: Page) {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const strip = document.querySelector(".side-window");
          const probe = document.querySelector("[data-caret-probe]");
          if (!strip || !probe) return null;
          const windowBottom = strip.getBoundingClientRect().bottom;
          const caretTop = probe.getBoundingClientRect().top;
          return {
            caretTop,
            windowBottom,
            scrollY: window.scrollY,
            below: caretTop > windowBottom && window.scrollY === 0,
          };
        }),
      { timeout: 5_000 },
    )
    .toMatchObject({ below: true, scrollY: 0 });
}

test("typing the first word never puts the caret above the window", async ({
  page,
}) => {
  await page.goto("/");
  const textarea = page.getByRole("textbox", { name: "Writing page" });
  await textarea.waitFor({ state: "visible", timeout: 15_000 });
  await textarea.click();

  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setDeviceMetricsOverride", {
    mobile: true,
    width: 390,
    height: 480,
    deviceScaleFactor: iphone.deviceScaleFactor ?? 3,
  });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );

  await textarea.pressSequentially("Hello", { delay: 30 });
  await expectCaretBelowWindow(page);

  await textarea.pressSequentially(" world", { delay: 30 });
  await expectCaretBelowWindow(page);
});
