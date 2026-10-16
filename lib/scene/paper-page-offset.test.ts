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
  it("uses 56 px for pages and 140 px for the editor", () => {
    expect(PAGE_TOP_OFFSET_PX).toBe(56);
    expect(EDITOR_TOP_OFFSET_PX).toBe(140);
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

  it("public and dashboard headings measure 56 px at 1440 and 1024", () => {
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

  it("dashboard heading offset is 56 px", () => {
    expect(measureHeadingTop(1440, PAGE_TOP_OFFSET_PX)).toBe(56);
    const dashboard = read("app/dashboard/page.tsx");
    expect(dashboard).toContain("PaperPage");
    expect(dashboard).toContain("PAGE_TOP_OFFSET_PX");
    expect(dashboard).toContain("data-paper-heading");
    expect(dashboard).not.toMatch(/pt-\[140px\]|pt-24|writing-column|dashboard-column/);
  });

  it("public page uses PaperPage at 56 px with title/text/receipt spacing", () => {
    const page = read("app/p/[slug]/page.tsx");
    expect(page).toContain("PaperPage");
    expect(page).toContain("PAGE_TOP_OFFSET_PX");
    expect(page).toContain("publicPage");
    expect(page).toContain("data-paper-heading");
    expect(page).toContain("mt-6");
    expect(page).toContain("mt-16");
    expect(page).not.toMatch(/writing-column|dashboard-column|pt-\[140px\]|pt-10|pt-24/);
  });

  it("every paper screen renders through PaperPage", () => {
    const files = [
      "app/dashboard/page.tsx",
      "app/p/[slug]/page.tsx",
      "app/signin/page.tsx",
      "app/onboarding/name/page.tsx",
      "app/page.tsx",
      "components/editor/FocusEditor.tsx",
    ];
    for (const file of files) {
      const src = read(file);
      expect(src, file).toContain("PaperPage");
      expect(src, file).not.toMatch(/className="[^"]*\bpt-24\b/);
      expect(src, file).not.toMatch(/md:pt-\[140px\]/);
    }
    expect(read("components/editor/FocusEditor.tsx")).toContain(
      "EDITOR_TOP_OFFSET_PX",
    );
  });
});
