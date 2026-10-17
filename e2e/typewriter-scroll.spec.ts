import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const globalsCss = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")
  // Fixture pages don't run the Tailwind pipeline.
  .replace(/@import\s+"tailwindcss";?\n?/, "")
  .replace(/@theme\s+inline\s*\{[\s\S]*?\}\n?/, "");

test("typing 60 lines keeps the caret above the bar", async ({ page }) => {
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
        --font-writing: Literata, Georgia, serif;
        --font-ui: "DM Mono", monospace;
        --bar-from-window: 184px;
        --bar-other-edge: 40px;
        --column-shift: 74px;
        --paper-page-top: 120px;
        --window-inset: 36px;
        --window-w: 112px;
      }
      html, body { margin: 0; padding: 0; background: var(--paper); overflow: hidden; }
      ${globalsCss}
      .font-writing { font-family: var(--font-writing); }
      .text-\\[20px\\] { font-size: 20px; }
      .leading-\\[1.7\\] { line-height: 1.7; }
      .text-ink { color: var(--ink); }
      .relative { position: relative; }
      .min-h-dvh { min-height: 100dvh; }
      .z-\\[2\\] { z-index: 2; }
      .bg-paper { background: var(--paper); }
    </style>
  </head>
  <body>
    <div class="relative min-h-dvh w-full bg-paper writing-shell-left">
      <div class="relative z-[2]">
        <div
          class="paper-column paper-column-scroll"
          data-writing-scroll
          data-paper-page
          style="box-sizing: border-box; padding-top: 120px; height: calc(100dvh - 88px); max-height: calc(100dvh - 88px); overflow-x: hidden; overflow-y: auto; margin-bottom: 0; padding-bottom: 0;"
        >
          <div class="writing-scroll-inner" data-piece-id="fixture">
            <div class="writing-frame" data-writing-frame>
              <div data-writing-mirror class="writing-mirror font-writing text-[20px] leading-[1.7]" aria-hidden></div>
              <textarea
                class="writing-text font-writing text-[20px] leading-[1.7] text-ink"
                rows="1"
                aria-label="Writing page"
              ></textarea>
            </div>
          </div>
        </div>
        <div class="editor-bar" data-editor-bar style="opacity: 1;">
          <p>Clear morning · Fri, Oct 16 · 0:00 · saved</p>
          <p>Publish</p>
        </div>
      </div>
    </div>
    <script>
      const MIN_ABOVE = 160;
      const scrollEl = document.querySelector("[data-writing-scroll]");
      const textarea = document.querySelector(".writing-text");
      const mirror = document.querySelector("[data-writing-mirror]");

      function measureCaretProbe(scroll, probe) {
        const probeRect = probe.getBoundingClientRect();
        const scrollRect = scroll.getBoundingClientRect();
        return {
          offsetTop: probeRect.top - scrollRect.top + scroll.scrollTop,
          height: probeRect.height || 34,
          spaceBelow: scrollRect.height - (probeRect.bottom - scrollRect.top),
        };
      }

      function typewriterScrollTop(scroll, caret, minAbove) {
        if (caret.spaceBelow >= minAbove) return null;
        return Math.max(
          0,
          caret.offsetTop + caret.height + minAbove - scroll.clientHeight,
        );
      }

      function syncHeight() {
        textarea.style.height = "auto";
        const lineMin = 20 * 1.7 * 3;
        textarea.style.height = Math.max(textarea.scrollHeight, lineMin) + "px";
      }

      function syncMirror() {
        const text = textarea.value;
        const caret = textarea.selectionStart;
        mirror.replaceChildren();
        if (caret > 0) mirror.append(document.createTextNode(text.slice(0, caret)));
        const probe = document.createElement("span");
        probe.setAttribute("data-caret-probe", "");
        probe.textContent = String.fromCharCode(0x200b);
        mirror.append(probe);
        if (caret < text.length) {
          mirror.append(document.createTextNode(text.slice(caret)));
        }
        if (text.endsWith("\\n")) {
          mirror.append(document.createTextNode(String.fromCharCode(0x200b)));
        }
      }

      function ensureCaret() {
        syncHeight();
        syncMirror();
        const probe = mirror.querySelector("[data-caret-probe]");
        if (!probe) return null;
        const caret = measureCaretProbe(scrollEl, probe);
        const next = typewriterScrollTop(scrollEl, caret, MIN_ABOVE);
        if (next !== null) scrollEl.scrollTop = next;
        scrollEl.dataset.scrolled = scrollEl.scrollTop > 0 ? "true" : "false";
        return { caret, next, scrollTop: scrollEl.scrollTop, clientHeight: scrollEl.clientHeight };
      }

      textarea.addEventListener("input", ensureCaret);
      textarea.addEventListener("keyup", ensureCaret);
      textarea.addEventListener("click", ensureCaret);
      syncHeight();
      syncMirror();
      window.__ensureCaret = ensureCaret;
    </script>
  </body>
</html>`);

  const textarea = page.locator('textarea[aria-label="Writing page"]');
  await textarea.click();

  const layout = await page.evaluate(() => {
    const scroll = document.querySelector(
      "[data-writing-scroll]",
    ) as HTMLElement;
    const cs = getComputedStyle(scroll);
    return {
      height: cs.height,
      maxHeight: cs.maxHeight,
      overflowY: cs.overflowY,
      rect: scroll.getBoundingClientRect().toJSON(),
      clientHeight: scroll.clientHeight,
      scrollHeight: scroll.scrollHeight,
      vh: window.innerHeight,
    };
  });
  expect(layout.rect.height).toBeLessThanOrEqual(layout.vh - 88 + 1);
  expect(layout.overflowY).toBe("auto");

  for (let i = 0; i < 60; i++) {
    await page.keyboard.type(`Line ${i + 1}`);
    await page.keyboard.press("Enter");
    await page.evaluate(() => {
      (window as unknown as { __ensureCaret: () => void }).__ensureCaret();
    });

    const metrics = await page.evaluate(() => {
      const bar = document.querySelector("[data-editor-bar]") as HTMLElement;
      const scroll = document.querySelector(
        "[data-writing-scroll]",
      ) as HTMLElement;
      const probe = document.querySelector(
        "[data-caret-probe]",
      ) as HTMLElement | null;
      const barRect = bar.getBoundingClientRect();
      const scrollRect = scroll.getBoundingClientRect();
      const probeRect = probe?.getBoundingClientRect();
      return {
        barTop: barRect.top,
        caretBottom: probeRect?.bottom ?? 0,
        scrollBottom: scrollRect.bottom,
        scrollOverlapsBar: scrollRect.bottom > barRect.top + 0.5,
      };
    });

    expect(
      metrics.barTop - metrics.caretBottom,
      `line ${i + 1}: caret should stay ≥160px above bar (bar=${metrics.barTop}, caret=${metrics.caretBottom}, scrollBottom=${metrics.scrollBottom})`,
    ).toBeGreaterThanOrEqual(160);
    expect(
      metrics.scrollOverlapsBar,
      `line ${i + 1}: scroll area must end above bar (scrollBottom=${metrics.scrollBottom}, barTop=${metrics.barTop})`,
    ).toBe(false);
  }
});
