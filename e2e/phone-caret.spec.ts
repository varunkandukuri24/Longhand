import { devices, expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

const WORDS = "Hello world this is a test of the caret".split(" ");
const TEN_LINES = Array.from(
  { length: 10 },
  (_, i) => `Line ${i + 1} of existing text.`,
).join("\n");

const PHONE_PROFILES = [
  { name: "iPhone 13", device: devices["iPhone 13"] },
  { name: "Pixel 7", device: devices["Pixel 7"] },
] as const;

async function expectCaretClearOfWindow(page: Page) {
  const metrics = await page.evaluate(() => {
    const strip = document.querySelector(".side-window");
    const probe = document.querySelector("[data-caret-probe]");
    if (!strip || !probe) return null;
    const windowBottom = strip.getBoundingClientRect().bottom;
    const caret = probe.getBoundingClientRect();
    const visual = window.visualViewport;
    const vvBottom = visual
      ? visual.offsetTop + visual.height
      : window.innerHeight;
    return {
      caretTop: caret.top,
      caretBottom: caret.bottom,
      windowBottom,
      vvBottom,
      scrollY: window.scrollY,
    };
  });
  expect(metrics, "caret probe and window should be present").not.toBeNull();
  expect(metrics!.caretTop).toBeGreaterThanOrEqual(metrics!.windowBottom);
  expect(metrics!.caretBottom).toBeLessThan(metrics!.vvBottom);
  expect(metrics!.scrollY).toBe(0);
}

async function simulateKeyboard(
  page: Page,
  width: number,
  deviceScaleFactor: number,
) {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setDeviceMetricsOverride", {
    mobile: true,
    width,
    height: 460,
    deviceScaleFactor,
  });
  await page.waitForTimeout(300);
}

async function typeWordsAssertingCaret(page: Page) {
  const textarea = page.getByRole("textbox", { name: "Writing page" });
  for (let i = 0; i < WORDS.length; i++) {
    const chunk = (i === 0 ? "" : " ") + WORDS[i];
    await textarea.pressSequentially(chunk, { delay: 20 });
    await expectCaretClearOfWindow(page);
  }
}

async function openGuestEditor(page: Page) {
  await page.goto("/");
  const textarea = page.getByRole("textbox", { name: "Writing page" });
  await textarea.waitFor({ state: "visible", timeout: 15_000 });
  await textarea.tap();
  return textarea;
}

async function openWriterEditor(page: Page): Promise<{
  cleanup: () => Promise<void>;
}> {
  const databaseUrl = process.env.DATABASE_URL;
  test.skip(!databaseUrl, "DATABASE_URL is required to sign in a writer");

  const sql = postgres(databaseUrl!, { max: 1 });
  const suffix = crypto.randomUUID().slice(0, 8);
  const userId = `phone-caret-${suffix}`;
  const token = `phone-caret-session-${crypto.randomUUID()}`;
  let pieceId = "";

  await sql`
    INSERT INTO users (id, email, display_name, handle)
    VALUES (
      ${userId},
      ${`${userId}@example.test`},
      ${"Phone Caret Writer"},
      ${`pcaret-${suffix}`}
    )
  `;
  const pieces = await sql<{ id: string }[]>`
    INSERT INTO pieces (user_id, title, status)
    VALUES (${userId}, ${""}, ${"draft"})
    RETURNING id
  `;
  pieceId = pieces[0]!.id;
  await sql`
    INSERT INTO auth_sessions (session_token, user_id, expires)
    VALUES (${token}, ${userId}, ${new Date(Date.now() + 86_400_000)})
  `;
  await page.context().addCookies([
    {
      name: "authjs.session-token",
      value: token,
      url: "http://localhost:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto(`/write/${pieceId}`);
  const textarea = page.getByRole("textbox", { name: "Writing page" });
  await textarea.waitFor({ state: "visible", timeout: 15_000 });
  await textarea.tap();

  return {
    cleanup: async () => {
      await sql`DELETE FROM auth_sessions WHERE session_token = ${token}`;
      await sql`DELETE FROM pieces WHERE id = ${pieceId || "00000000-0000-0000-0000-000000000000"}`;
      await sql`DELETE FROM users WHERE id = ${userId}`;
      await sql.end();
    },
  };
}

for (const profile of PHONE_PROFILES) {
  const { device } = profile;
  const width = device.viewport!.width;
  const scale = device.deviceScaleFactor ?? 3;

  test.describe(`${profile.name} phone caret`, () => {
    test.use({
      userAgent: device.userAgent,
      viewport: device.viewport,
      deviceScaleFactor: device.deviceScaleFactor,
      isMobile: device.isMobile,
      hasTouch: device.hasTouch,
    });

    test("guest home: caret stays below the window while typing", async ({
      page,
    }) => {
      await openGuestEditor(page);
      await simulateKeyboard(page, width, scale);
      await typeWordsAssertingCaret(page);
    });

    test("guest home: caret stays clear with ten lines already written", async ({
      page,
    }) => {
      const textarea = await openGuestEditor(page);
      await textarea.pressSequentially(TEN_LINES, { delay: 5 });
      await textarea.evaluate((el: HTMLTextAreaElement) => {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      });
      await simulateKeyboard(page, width, scale);
      await typeWordsAssertingCaret(page);
    });

    test("writer page: caret stays below the window while typing", async ({
      page,
    }) => {
      const { cleanup } = await openWriterEditor(page);
      try {
        await simulateKeyboard(page, width, scale);
        await typeWordsAssertingCaret(page);
      } finally {
        await cleanup();
      }
    });

    test("writer page: caret stays clear with ten lines already written", async ({
      page,
    }) => {
      const { cleanup } = await openWriterEditor(page);
      try {
        const textarea = page.getByRole("textbox", { name: "Writing page" });
        await textarea.pressSequentially(TEN_LINES, { delay: 5 });
        await textarea.evaluate((el: HTMLTextAreaElement) => {
          el.focus();
          el.setSelectionRange(el.value.length, el.value.length);
        });
        await simulateKeyboard(page, width, scale);
        await typeWordsAssertingCaret(page);
      } finally {
        await cleanup();
      }
    });
  });
}

test.describe("desktop editor geometry", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("column and window stay in the desktop layout", async ({ page }) => {
    await page.goto("/");
    const textarea = page.getByRole("textbox", { name: "Writing page" });
    await textarea.waitFor({ state: "visible", timeout: 15_000 });

    const metrics = await page.evaluate(() => {
      const col = document.querySelector(".paper-column-scroll");
      const win = document.querySelector(".side-window");
      if (!col || !win) return null;
      const colRect = col.getBoundingClientRect();
      const winRect = win.getBoundingClientRect();
      const style = getComputedStyle(col);
      return {
        placement: win.getAttribute("data-window-placement"),
        col: {
          top: colRect.top,
          left: colRect.left,
          width: colRect.width,
          height: colRect.height,
        },
        win: {
          top: winRect.top,
          left: winRect.left,
          width: winRect.width,
          height: winRect.height,
        },
        position: style.position,
        paddingTop: style.paddingTop,
      };
    });

    expect(metrics).not.toBeNull();
    expect(metrics!.placement).not.toBe("top");
    // Desktop keeps normal flow: not the phone absolute scroll box.
    expect(metrics!.position).not.toBe("absolute");
    expect(parseFloat(metrics!.paddingTop)).toBeGreaterThanOrEqual(120);
    // Desktop: window is a tall side strip on the right.
    expect(metrics!.win.height).toBeGreaterThan(700);
    expect(metrics!.win.left).toBeGreaterThan(1000);
    expect(metrics!.col.width).toBeGreaterThan(400);
  });
});
