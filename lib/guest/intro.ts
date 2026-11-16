export const INTRO_SEEN_KEY = "lh_intro_seen";

export function isIntroSeen(): boolean {
  try {
    return window.localStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    window.localStorage.setItem(INTRO_SEEN_KEY, "1");
  } catch {
    /* ignore — intro may show again next visit */
  }
}
