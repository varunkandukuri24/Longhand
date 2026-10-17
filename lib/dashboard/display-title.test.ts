import { describe, expect, it } from "vitest";
import { dashboardDisplayTitle } from "./display-title";
import {
  DASHBOARD_HEADING_TOP_PX,
  PAGES_ARIA_LABEL,
  PAGES_HREF,
  PAGE_TOP_OFFSET_PX,
} from "./layout";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("dashboardDisplayTitle", () => {
  it("uses the title when set", () => {
    const shown = dashboardDisplayTitle({
      title: "Notes on the race",
      bodyText: "ignored when title is set",
    });
    expect(shown.label).toBe("Notes on the race");
    expect(shown.muted).toBe(false);
  });

  it("uses the first line of the body when untitled", () => {
    const shown = dashboardDisplayTitle({
      title: "",
      bodyText: "My own first line\nmore",
    });
    expect(shown.label).toBe("My own first line");
    expect(shown.muted).toBe(true);
  });

  it("falls back to Untitled for an empty piece", () => {
    const shown = dashboardDisplayTitle({
      title: "",
      bodyText: "",
    });
    expect(shown.label).toBe("Untitled");
    expect(shown.muted).toBe(true);
  });
});

describe("dashboard layout tokens", () => {
  it("heading top offset is 56 px in code and CSS", () => {
    expect(DASHBOARD_HEADING_TOP_PX).toBe(56);
    expect(PAGE_TOP_OFFSET_PX).toBe(56);
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    expect(css).toMatch(/padding-top:\s*var\(--paper-page-top\)/);
    expect(css).toMatch(/\.paper-column\s*\{[\s\S]*?margin-top:\s*0/);
  });

  it("Pages back button targets the dashboard", () => {
    expect(PAGES_HREF).toBe("/dashboard");
    expect(PAGES_ARIA_LABEL).toBe("Back to your pages");
    const controls = readFileSync(
      join(process.cwd(), "components/editor/EditorControls.tsx"),
      "utf8",
    );
    expect(controls).not.toContain("PAGES_HREF");
    expect(controls).not.toContain("PagesBackLink");
    const ownerBack = readFileSync(
      join(process.cwd(), "components/dashboard/PagesBackLink.tsx"),
      "utf8",
    );
    expect(ownerBack).toContain("href = PAGES_HREF");
    expect(ownerBack).toContain("label = PAGES_ARIA_LABEL");
    expect(ownerBack).toContain('"Pages"');
    expect(ownerBack).toContain("pages-back-arrow");
    expect(ownerBack).toContain("href?: string");
    expect(ownerBack).toContain("label?: string");
    const editor = readFileSync(
      join(process.cwd(), "components/editor/FocusEditor.tsx"),
      "utf8",
    );
    expect(editor).toContain("PagesBackLink");
  });
});

