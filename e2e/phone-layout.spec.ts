import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

const PHONES = [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
] as const;

const RECEIPT_METRICS = {
  version: 1,
  activeWritingTimeMs: 60_000,
  elapsedSpanMs: 60_000,
  typedShare: 1,
  pastedShare: 0,
  quotedShare: 0,
  revisionRatio: 1,
  sessionCount: 1,
  wordCount: 12,
  fastStretchCount: 0,
  uniformTypingRunCount: 0,
  delayedBatchCount: 0,
  sessionRows: [],
  sittingRows: [],
};

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
}

async function expectPhoneWindow(page: Page) {
  const windowEl = page.locator(".side-window");
  await expect(windowEl).toBeVisible();
  await expect(windowEl).toHaveAttribute("data-window-placement", "top");
  const box = await windowEl.boundingBox();
  expect(box).toBeTruthy();
  expect(box!.width).toBeGreaterThan(300);
  expect(box!.height).toBeGreaterThan(50);
  expect(box!.height).toBeLessThan(120);
}

async function expectPhoneBar(page: Page) {
  const bar = page.locator("[data-editor-bar]");
  await expect(bar).toBeVisible();
  const text = (await bar.innerText()).replace(/\s+/g, " ");
  expect(text).toMatch(/·/);
  expect(text).toMatch(/Timer/);
  expect(text).not.toMatch(/Type/);
  expect(text).not.toMatch(/No backspace/);
  expect(text).not.toMatch(/Scene/);
  expect(text).not.toMatch(/Publish/);
  expect(text).not.toMatch(/Clear morning|Sunny|Sunset|Overcast|Raining|Snowing/);
}

test.describe("phone layout", () => {
  for (const size of PHONES) {
    test.describe(`${size.width}×${size.height}`, () => {
      test.use({ viewport: size });

      test("guest home has a top window and a quiet bar", async ({ page }) => {
        await page.goto("/");
        await expectNoHorizontalOverflow(page);
        await expectPhoneWindow(page);
        await expectPhoneBar(page);
        await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
        await expect(page.locator("[data-phone-publish]")).toHaveCount(0);
        const barBox = await page.locator("[data-editor-bar]").boundingBox();
        expect(barBox).toBeTruthy();
        expect(barBox!.x + barBox!.width).toBeLessThanOrEqual(size.width + 1);
      });

      test("signed-in editor puts Publish in the top row", async ({ page }) => {
        const databaseUrl = process.env.DATABASE_URL;
        test.skip(!databaseUrl, "DATABASE_URL is required to sign in a writer");

        const sql = postgres(databaseUrl!, { max: 1 });
        const suffix = crypto.randomUUID().slice(0, 8);
        const userId = `phone-e2e-${suffix}`;
        const token = `phone-session-${crypto.randomUUID()}`;
        let pieceId = "";

        try {
          await sql`
            INSERT INTO users (id, email, display_name, handle)
            VALUES (
              ${userId},
              ${`${userId}@example.test`},
              ${"Phone Writer"},
              ${`phone-${suffix}`}
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
          await expectNoHorizontalOverflow(page);
          await expectPhoneWindow(page);
          await expectPhoneBar(page);
          const publish = page.locator("[data-phone-publish]");
          await expect(publish).toBeVisible();
          const publishBox = await publish.boundingBox();
          expect(publishBox).toBeTruthy();
          expect(publishBox!.y).toBeLessThan(60);
          await expect(
            page.locator("[data-editor-bar]").getByRole("button", {
              name: "Publish",
            }),
          ).toHaveCount(0);
        } finally {
          await sql`DELETE FROM auth_sessions WHERE session_token = ${token}`;
          await sql`DELETE FROM pieces WHERE id = ${pieceId || "00000000-0000-0000-0000-000000000000"}`;
          await sql`DELETE FROM users WHERE id = ${userId}`;
          await sql.end();
        }
      });

      test("piece page and writer page keep the strip and do not overflow", async ({
        page,
      }) => {
        const databaseUrl = process.env.DATABASE_URL;
        test.skip(!databaseUrl, "DATABASE_URL is required");

        const sql = postgres(databaseUrl!, { max: 1 });
        const suffix = crypto.randomUUID().slice(0, 8);
        const userId = `phone-pub-${suffix}`;
        const handle = `ppub-${suffix}`;
        const slug = `phone-essay-${suffix}`;
        let pieceId = "";

        try {
          await sql`
            INSERT INTO users (id, email, display_name, handle)
            VALUES (
              ${userId},
              ${`${userId}@example.test`},
              ${"Phone Author"},
              ${handle}
            )
          `;
          const pieces = await sql<{ id: string }[]>`
            INSERT INTO pieces (
              user_id, title, status, visibility, slug,
              final_text, final_text_hash, published_at
            )
            VALUES (
              ${userId},
              ${"A short essay"},
              ${"published"},
              ${"private"},
              ${slug},
              ${"Hello from a phone-sized page."},
              ${"hash"},
              ${new Date()}
            )
            RETURNING id
          `;
          pieceId = pieces[0]!.id;
          await sql`
            INSERT INTO receipts (piece_id, metrics, chain_head_hash)
            VALUES (
              ${pieceId},
              ${JSON.stringify(RECEIPT_METRICS)},
              ${"head"}
            )
          `;

          await page.goto(`/p/${slug}`);
          await expect(page.getByRole("heading", { name: "A short essay" })).toBeVisible();
          await expectNoHorizontalOverflow(page);
          await expectPhoneWindow(page);

          await page.goto(`http://${handle}.localhost:3000/`);
          await expect(page.getByRole("heading", { name: "Phone Author" })).toBeVisible();
          await expectNoHorizontalOverflow(page);
          await expectPhoneWindow(page);
        } finally {
          if (pieceId) {
            await sql`DELETE FROM receipts WHERE piece_id = ${pieceId}`;
            await sql`DELETE FROM pieces WHERE id = ${pieceId}`;
          }
          await sql`DELETE FROM users WHERE id = ${userId}`;
          await sql.end();
        }
      });
    });
  }

  test("desktop editor at 1440×900 is unchanged", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await expectNoHorizontalOverflow(page);

    const windowEl = page.locator(".side-window");
    await expect(windowEl).toBeVisible();
    await expect(windowEl).toHaveAttribute("data-window-placement", "side");
    const box = await windowEl.boundingBox();
    expect(box).toBeTruthy();
    expect(Math.round(box!.width)).toBe(112);
    expect(box!.height).toBeGreaterThan(700);
    expect(box!.x).toBeGreaterThan(1200);

    const bar = page.locator("[data-editor-bar]");
    await expect(bar).toBeVisible();
    const text = await bar.innerText();
    expect(text).toMatch(/Type/);
    expect(text).toMatch(/Timer/);
    expect(text).toMatch(/No backspace/);
    expect(text).toMatch(/Scene/);
    expect(text).toMatch(/Publish/);
    await expect(page.locator("[data-phone-publish]")).toHaveCount(0);
    await expect(page.locator("[data-phone-bar]")).toHaveCount(0);
  });
});
