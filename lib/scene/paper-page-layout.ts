import type { CSSProperties } from "react";

/** Shared paper-page top offsets (DESIGN.md). */
export const PAGE_TOP_OFFSET_PX = 56;
export const EDITOR_TOP_OFFSET_PX = 140;

/** Alias for dashboard / public / sign-in heading offset. */
export const DASHBOARD_HEADING_TOP_PX = PAGE_TOP_OFFSET_PX;

export function paperPageTopStyle(topOffsetPx: number): CSSProperties {
  return {
    ["--paper-page-top" as string]: `${topOffsetPx}px`,
  };
}
