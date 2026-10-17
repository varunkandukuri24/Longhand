import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const globalsCss = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")
  .replace(/@import\s+"tailwindcss";?\n?/, "")
  .replace(/@theme\s+inline\s*\{[\s\S]*?\}\n?/, "");

test("REFERENCES sits above the bottom bar when the text is short", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.setContent(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <style>
      :root {
        --ink: #1c1a16;
        --label: #736c61;
        --paper: #ffffff;
        --caret: #c9772e;
        --font-writing: Literata, serif;
        --font-ui: "DM Mono", monospace;
        --bar-from-window: 120px;
        --bar-other-edge: 40px;
        --column-shift: 40px;
        --paper-page-top: 120px;
        --window-inset: 20px;
        --window-w: 72px;
      }
      html, body { margin: 0; padding: 0; background: var(--paper); overflow: hidden; }
      ${globalsCss}
    </style>
  </head>
  <body>
    <div class="relative min-h-dvh w-full bg-paper text-ink writing-shell-left">
      <div class="relative z-[2]">
        <div
          class="paper-column paper-column-scroll"
          data-paper-page
          data-writing-scroll
          data-top-offset="120"
          style="box-sizing: border-box; padding-top: 120px;"
        >
          <div data-piece-id="fixture">
            <div class="writing-frame" data-writing-frame>
              <div class="writing-mirror font-writing text-[20px] leading-[1.7]" aria-hidden>
                hi nytimes.com there
              </div>
              <textarea
                class="writing-text font-writing text-[20px] leading-[1.7] text-ink"
                rows="1"
                aria-label="Writing page"
              >hi nytimes.com there</textarea>
            </div>
            <div class="mt-14 w-full" data-references-row>
              <p class="font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
                References
              </p>
              <ul class="mt-3 flex flex-wrap gap-2.5">
                <li>
                  <span class="reference-pill">
                    <span>nytimes.com</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div
          class="editor-bar"
          data-editor-bar
          style="opacity: 1; pointer-events: auto;"
        >
          <p>Clear morning · Fri, Oct 16 · 0:12 · saved</p>
          <p>Publish</p>
        </div>
      </div>
    </div>
    <script>
      const el = document.querySelector(".writing-text");
      if (el) {
        el.style.height = "auto";
        const lineMin = 20 * 1.7 * 3;
        el.style.height = Math.max(el.scrollHeight, lineMin) + "px";
      }
    </script>
  </body>
</html>`);

  await page.addStyleTag({
    content: `
      .mt-14 { margin-top: 3.5rem; }
      .mt-3 { margin-top: 0.75rem; }
      .w-full { width: 100%; }
      .flex { display: flex; }
      .flex-wrap { flex-wrap: wrap; }
      .gap-2.5 { gap: 0.625rem; }
      .relative { position: relative; }
      .min-h-dvh { min-height: 100dvh; }
      .z-\\[2\\] { z-index: 2; }
      .text-\\[11px\\] { font-size: 11px; }
      .text-\\[20px\\] { font-size: 20px; }
      .leading-\\[1.7\\] { line-height: 1.7; }
      .tracking-\\[0.14em\\] { letter-spacing: 0.14em; }
      .uppercase { text-transform: uppercase; }
      .text-\\[\\#9A9387\\] { color: #9a9387; }
      .font-ui { font-family: var(--font-ui); }
      .font-writing { font-family: var(--font-writing); }
      .text-ink { color: var(--ink); }
      .bg-paper { background: var(--paper); }
    `,
  });

  const refs = page.locator("[data-references-row]");
  const bar = page.locator("[data-editor-bar]");
  await expect(refs).toBeVisible();
  await expect(bar).toBeVisible();

  const refsBox = await refs.boundingBox();
  const barBox = await bar.boundingBox();
  expect(refsBox).not.toBeNull();
  expect(barBox).not.toBeNull();
  expect(refsBox!.y + refsBox!.height).toBeLessThan(barBox!.y);
});
