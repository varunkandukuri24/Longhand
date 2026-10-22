import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";

async function expectWritingTextareaFocused(page: Page) {
  const textarea = page.getByRole("textbox", { name: "Writing page" });
  await textarea.waitFor({ state: "visible", timeout: 15_000 });
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const el = document.querySelector(
            'textarea[aria-label="Writing page"]',
          );
          return document.activeElement === el;
        }),
      { timeout: 10_000 },
    )
    .toBe(true);
}

test("guest home focuses the writing textarea on load", async ({ page }) => {
  await page.goto("/");
  await expectWritingTextareaFocused(page);
});

test("writer page focuses the writing textarea on load", async ({ page }) => {
  const databaseUrl = process.env.DATABASE_URL;
  test.skip(!databaseUrl, "DATABASE_URL is required to sign in a writer");

  const sql = postgres(databaseUrl!, { max: 1 });
  const suffix = crypto.randomUUID().slice(0, 8);
  const userId = `caret-e2e-${suffix}`;
  const token = `caret-session-${crypto.randomUUID()}`;
  let pieceId = "";

  try {
    await sql`
      INSERT INTO users (id, email, display_name, handle)
      VALUES (
        ${userId},
        ${`${userId}@example.test`},
        ${"Caret Writer"},
        ${`caret-${suffix}`}
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
    await expectWritingTextareaFocused(page);
  } finally {
    await sql`DELETE FROM auth_sessions WHERE session_token = ${token}`;
    await sql`DELETE FROM pieces WHERE id = ${pieceId || "00000000-0000-0000-0000-000000000000"}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
    await sql.end();
  }
});
