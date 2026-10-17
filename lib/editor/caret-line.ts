/**
 * Measure the caret's line box relative to a scroll container.
 * Prefer a probe span already rendered in the mirror layer (`data-caret-probe`).
 */

export type CaretLineBox = {
  /** Distance from the scroll area's content top to the line's top. */
  offsetTop: number;
  /** Line height in px. */
  height: number;
  /** Distance from the scroll area's visible bottom to the line's bottom. */
  spaceBelow: number;
};

/** Read a caret probe already in the mirror (must share the textarea's wrapping). */
export function measureCaretProbe(
  scrollEl: HTMLElement,
  probeEl: HTMLElement,
): CaretLineBox {
  const probeRect = probeEl.getBoundingClientRect();
  const scrollRect = scrollEl.getBoundingClientRect();
  const offsetTop = probeRect.top - scrollRect.top + scrollEl.scrollTop;
  const height =
    probeRect.height ||
    parseFloat(getComputedStyle(probeEl).lineHeight) ||
    0;
  const lineBottomInView = probeRect.bottom - scrollRect.top;
  const spaceBelow = scrollRect.height - lineBottomInView;
  return { offsetTop, height, spaceBelow };
}

/** Keep the caret line at least `minAboveBottom` px above the scroll area bottom. */
export function typewriterScrollTop(
  scrollEl: HTMLElement,
  caret: CaretLineBox,
  minAboveBottom: number,
): number | null {
  if (caret.spaceBelow >= minAboveBottom) {
    return null;
  }
  const targetBottomInContent =
    caret.offsetTop + caret.height + minAboveBottom;
  const next = targetBottomInContent - scrollEl.clientHeight;
  return Math.max(0, next);
}

export const TYPEWRITER_MIN_ABOVE_BOTTOM_PX = 160;
