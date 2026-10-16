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
  it("never uses the source article title for a response piece", () => {
    const sourceTitle = "Roman Stanek becomes latest gaijin";
    const shown = dashboardDisplayTitle({
      mode: "response",
      title: sourceTitle,
      sourceTitle,
      bodyText: "My own first line\nmore",
    });
    expect(shown.label).toBe("My own first line");
    expect(shown.label).not.toBe(sourceTitle);
    expect(shown.muted).toBe(true);
  });

  it("uses the writer's title when it differs from the source", () => {
    const shown = dashboardDisplayTitle({
      mode: "response",
      title: "Notes on the race",
      sourceTitle: "Roman Stanek becomes latest gaijin",
      bodyText: "ignored when title is set",
    });
    expect(shown.label).toBe("Notes on the race");
    expect(shown.muted).toBe(false);
  });

  it("falls back to Untitled for an empty response", () => {
    const shown = dashboardDisplayTitle({
      mode: "response",
      title: "Article title",
      sourceTitle: "Article title",
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
    const css = readFileSync(
      join(process.cwd(), "app/globals.css"),
      "utf8",
    );
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
    expect(controls).toContain("href={PAGES_HREF}");
    expect(controls).toContain("PAGES_ARIA_LABEL");
    expect(controls).toContain("Pages");
  });
});
