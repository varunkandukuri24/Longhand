"use client";

import { PaperShell } from "@/components/scene/PaperShell";
import {
  EDITOR_TOP_OFFSET_PX,
  PAGE_TOP_OFFSET_PX,
  paperPageTopStyle,
} from "@/lib/scene/paper-page-layout";
import type {
  CSSProperties,
  PointerEventHandler,
  ReactNode,
  Ref,
  UIEventHandler,
} from "react";

export { EDITOR_TOP_OFFSET_PX, PAGE_TOP_OFFSET_PX };

type PaperPageProps = {
  children: ReactNode;
  /**
   * Fixed UI that must sit outside the transformed column (e.g. editor bar).
   * `position: fixed` breaks inside `.paper-column` because it uses transform.
   */
  chrome?: ReactNode;
  /** Editor text: 120. Every other page's first heading: 56. */
  topOffsetPx: typeof PAGE_TOP_OFFSET_PX | typeof EDITOR_TOP_OFFSET_PX;
  publicPage?: boolean;
  hideWindow?: boolean;
  /** Smooth transitions for the writing column (editor). */
  slide?: boolean;
  /**
   * Editor only: column is its own scroll area ending 88 px above the viewport
   * bottom so text never runs under the bar.
   */
  editorScroll?: boolean;
  columnRef?: Ref<HTMLDivElement>;
  onColumnScroll?: UIEventHandler<HTMLDivElement>;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
  className?: string;
  style?: CSSProperties;
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
  hideWindow = false,
  slide = false,
  editorScroll = false,
  columnRef,
  onColumnScroll,
  onPointerDown,
  className = "",
  style,
}: PaperPageProps) {
  return (
    <PaperShell
      publicPage={publicPage}
      hideWindow={hideWindow}
      className={[slide ? "writing-shell-slide" : "", className]
        .filter(Boolean)
        .join(" ")}
      style={style}
      onPointerDown={onPointerDown}
      chrome={chrome}
    >
      <div
        ref={columnRef}
        className={[
          "paper-column",
          editorScroll ? "paper-column-scroll" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        data-paper-page
        data-top-offset={topOffsetPx}
        data-writing-scroll={editorScroll ? "" : undefined}
        style={paperPageTopStyle(topOffsetPx)}
        onScroll={onColumnScroll}
      >
        {children}
      </div>
    </PaperShell>
  );
}
