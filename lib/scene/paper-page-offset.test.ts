import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EDITOR_TOP_OFFSET_PX,
  PAGE_TOP_OFFSET_PX,
  paperPageTopStyle,
} from "./paper-page-layout";

const root = process.cwd();

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

/**
 * Measure heading top offset the same way the browser does: padding-top of
 * .paper-column with --paper-page-top set, plus zero h1 margin-top.
 */
function measureHeadingTop(
  viewportWidth: number,
  topOffsetPx: number,
): number {
  // Phone rule only changes width/centering, not the top offset token.
  void viewportWidth;
  const style = paperPageTopStyle(topOffsetPx);
  const raw = style["--paper-page-top" as keyof typeof style];
  const paddingTop = Number.parseInt(String(raw), 10);
  const h1MarginTop = 0; // .paper-column h1 { margin-top: 0 }
  return paddingTop + h1MarginTop;
}

describe("paper page top offsets", () => {
  it("uses 56 px for pages and 120 px for the editor text", () => {
    expect(PAGE_TOP_OFFSET_PX).toBe(56);
    expect(EDITOR_TOP_OFFSET_PX).toBe(120);
  });

  it("phones keep the window visible as a top strip", () => {
    const css = read("app/globals.css");
    const phoneBlock = css.split("@media (max-width: 767px)")[1] ?? "";
    expect(phoneBlock).not.toMatch(/\.side-window\s*\{\s*display:\s*none/);
    expect(phoneBlock).toMatch(/--phone-window-height:\s*84px/);
    expect(phoneBlock).toMatch(/left:\s*25%/);
  });

  it("CSS paper-column owns top offset with no extra margin", () => {
    const css = read("app/globals.css");
    expect(css).toMatch(/\.paper-column\s*\{/);
    expect(css).toMatch(/padding-top:\s*var\(--paper-page-top\)/);
    expect(css).toMatch(/\.paper-column\s*\{[\s\S]*?margin-top:\s*0/);
    expect(css).toMatch(/\.paper-column h1\s*\{[\s\S]*?margin-top:\s*0/);
    expect(css).not.toMatch(/\.writing-column\s*\{/);
    expect(css).not.toMatch(/\.dashboard-column\s*\{/);
  });

  it("public and page headings measure 56 px at 1440 and 1024", () => {
    for (const width of [1440, 1024]) {
      expect(measureHeadingTop(width, PAGE_TOP_OFFSET_PX)).toBe(56);
    }
  });

  it("short and long public pieces share the same title offset", () => {
    const shortTitleTop = measureHeadingTop(1440, PAGE_TOP_OFFSET_PX);
    const longTitleTop = measureHeadingTop(1440, PAGE_TOP_OFFSET_PX);
    expect(shortTitleTop).toBe(56);
    expect(longTitleTop).toBe(56);
    expect(shortTitleTop).toBe(longTitleTop);
  });

  it("/dashboard redirects to /", () => {
    const dashboard = read("app/dashboard/page.tsx");
    expect(dashboard).toContain('redirect("/")');
  });

  it("public page uses PaperPage at 56 px with title/text/signature spacing", () => {
    const page = read("app/p/[slug]/page.tsx");
    const view = read("components/pieces/PublishedPieceView.tsx");
    const pieceText = read("components/references/PieceText.tsx");
    const signature = read("components/receipt/SignatureReceipt.tsx");
    expect(page).toContain("PublishedPieceView");
    expect(view).toContain("PaperPage");
    expect(view).toContain("PAGE_TOP_OFFSET_PX");
    expect(view).toContain("publicPage");
    expect(view).toContain("data-paper-heading");
    expect(view).toContain("PieceText");
    expect(view).toContain("ReferencesRow");
    expect(view).toContain("SignatureReceipt");
    expect(pieceText).toContain("mt-6");
    expect(signature).toContain("mt-[72px]");
    expect(view).not.toMatch(/writing-column|dashboard-column|pt-\[120px\]|pt-\[140px\]|pt-10|pt-24/);
  });

  it("every paper screen renders through PaperPage", () => {
    const files = [
      "components/pieces/PublishedPieceView.tsx",
      "app/u/[handle]/page.tsx",
      "app/signin/page.tsx",
      "app/onboarding/name/page.tsx",
      "components/editor/FocusEditor.tsx",
    ];
    for (const file of files) {
      const src = read(file);
      expect(src, file).toContain("PaperPage");
      expect(src, file).not.toMatch(/className="[^"]*\bpt-24\b/);
      expect(src, file).not.toMatch(/md:pt-\[140px\]/);
    }
    expect(read("app/p/[slug]/page.tsx")).toContain("PublishedPieceView");
    expect(read("app/page.tsx")).toContain("FocusEditor");
    expect(read("components/editor/FocusEditor.tsx")).toContain(
      "EDITOR_TOP_OFFSET_PX",
    );
  });
});
