/**
 * Whether a scene change should crossfade (vs snap instantly).
 * Hidden tabs must snap: rAF is paused, so a queued crossfade only
 * starts on return and reads as a grey half-blend for minutes.
 */
export function shouldCrossfadeScene(opts: {
  documentHidden: boolean;
  noMotion: boolean;
}): boolean {
  if (opts.noMotion || opts.documentHidden) return false;
  return true;
}

export const NO_SCENE_TRANSITION_CLASS = "side-window-no-transition";

/**
 * Suppress sun/moon/pane transitions for one frame so an instant scene
 * snap does not glide over the 3-minute celestial transition.
 */
export function withNoSceneTransition(
  root: HTMLElement | null,
  apply: () => void,
  raf?: (cb: FrameRequestCallback) => number,
): void {
  if (!root) {
    apply();
    return;
  }
  root.classList.add(NO_SCENE_TRANSITION_CLASS);
  apply();
  (raf ?? requestAnimationFrame)(() => {
    root.classList.remove(NO_SCENE_TRANSITION_CLASS);
  });
}
