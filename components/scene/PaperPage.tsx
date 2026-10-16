"use client";

import { PaperShell } from "@/components/scene/PaperShell";
import {
  EDITOR_TOP_OFFSET_PX,
  PAGE_TOP_OFFSET_PX,
  paperPageTopStyle,
} from "@/lib/scene/paper-page-layout";
import type { WindowSide } from "@/lib/scene";
import type { PointerEventHandler, ReactNode } from "react";

export { EDITOR_TOP_OFFSET_PX, PAGE_TOP_OFFSET_PX };

type PaperPageProps = {
  children: ReactNode;
  /**
   * Fixed UI that must sit outside the transformed column (e.g. editor bar).
   * `position: fixed` breaks inside `.paper-column` because it uses transform.
   */
  chrome?: ReactNode;
  /** Editor text: 140. Every other page's first heading: 56. */
  topOffsetPx: typeof PAGE_TOP_OFFSET_PX | typeof EDITOR_TOP_OFFSET_PX;
  publicPage?: boolean;
  initialWindowSide?: WindowSide;
  hideWindow?: boolean;
  /** Smooth side-switch for the writing column (editor). */
  slide?: boolean;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  className?: string;
};

/**
 * One layout for every paper screen: paper, grain, side window, column, top offset.
 * Pages pass content only — never their own top padding, margin, or centering.
 */
export function PaperPage({
  children,
  chrome = null,
  topOffsetPx,
  publicPage = false,
  initialWindowSide = "left",
  hideWindow = false,
  slide = false,
  onPointerDown,
  className = "",
}: PaperPageProps) {
  return (
    <PaperShell
      publicPage={publicPage}
      initialWindowSide={initialWindowSide}
      hideWindow={hideWindow}
      className={[slide ? "writing-shell-slide" : "", className]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={onPointerDown}
    >
      <div
        className="paper-column"
        data-paper-page
        data-top-offset={topOffsetPx}
        style={paperPageTopStyle(topOffsetPx)}
      >
        {children}
      </div>
      {chrome}
    </PaperShell>
  );
}
