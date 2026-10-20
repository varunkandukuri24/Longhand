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
