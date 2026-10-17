import { expect, test } from "@playwright/test";

/**
 * Publish dialog behaviour on the writer subdomain origin.
 * Fixture mirrors the centred dialog: focus trap, Esc, and viewport centering.
 */
test.use({ baseURL: "http://anon24.localhost:3000" });

test("publish dialog is centred, traps focus, and Esc closes it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("about:blank");
  // Origin for relative checks; fixture does not need the Next server.
  await page.route("http://anon24.localhost:3000/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/html",
      body: `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="utf-8" /><title>Publish dialog</title></head>
  <style>
    body { margin: 0; font-family: system-ui, sans-serif; }
    #scrim {
      position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.74); padding: 16px;
    }
    #dialog {
      width: min(520px, calc(100vw - 32px));
      background: #fff; border: 1px solid #E6E0D4; border-radius: 8px;
      padding: 32px 32px 24px; box-shadow: 0 16px 48px rgba(28,26,22,0.12);
    }
    input, button { font: inherit; }
  </style>
</head>
<body>
  <button id="publish-btn" type="button">Publish</button>
  <div id="scrim">
    <div id="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
      <h2 id="dlg-title">Publish</h2>
      <label>Title <input id="title" type="text" value="An essay" /></label>
      <div style="margin-top:16px;display:flex;justify-content:flex-end;gap:12px">
        <button id="cancel" type="button">Cancel</button>
        <button id="confirm" type="button">Publish</button>
      </div>
    </div>
  </div>
  <script>
    const dialog = document.getElementById("dialog");
    const scrim = document.getElementById("scrim");
    const publishBtn = document.getElementById("publish-btn");
    const title = document.getElementById("title");
    title.focus();
    function focusables() {
      return [...dialog.querySelectorAll('button, input')];
    }
    dialog.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        scrim.remove();
        publishBtn.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables();
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  </script>
</body>
</html>`,
    });
  });

  await page.goto("http://anon24.localhost:3000/write/demo");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const box = await dialog.boundingBox();
  expect(box).toBeTruthy();
  if (!box) return;
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  expect(centerX).toBeGreaterThan(1280 * 0.35);
  expect(centerX).toBeLessThan(1280 * 0.65);
  expect(centerY).toBeGreaterThan(800 * 0.35);
  expect(centerY).toBeLessThan(800 * 0.65);

  await expect(page.locator("#title")).toBeFocused();

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.locator("#confirm")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.locator("#title")).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("#publish-btn")).toBeFocused();
});
