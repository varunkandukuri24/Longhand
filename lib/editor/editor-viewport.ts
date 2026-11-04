/** Wait for the phone scroll area's 200 ms top transition, plus a little slack. */
export const EDITOR_WINDOW_SETTLE_MS = 240;

export type VisualViewportLike = {
  offsetTop: number;
  height: number;
};

export function visualViewportBox(
  visual: VisualViewportLike | null | undefined,
  innerHeight: number,
): { top: number; height: number } {
  return {
    top: visual?.offsetTop ?? 0,
    height: visual?.height ?? innerHeight,
  };
}
