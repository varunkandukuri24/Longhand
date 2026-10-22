export const GUEST_CARET_KEY = "lh-caret";

export function saveGuestCaret(index: number): void {
  try {
    sessionStorage.setItem(GUEST_CARET_KEY, String(index));
  } catch {
    /* ignore */
  }
}

export function takeGuestCaret(): number | null {
  try {
    const raw = sessionStorage.getItem(GUEST_CARET_KEY);
    if (raw === null) return null;
    sessionStorage.removeItem(GUEST_CARET_KEY);
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function nudgeDismissedKey(pieceId: string): string {
  return `lh-nudge-dismissed:${pieceId}`;
}

export function isNudgeDismissed(pieceId: string): boolean {
  try {
    return window.localStorage.getItem(nudgeDismissedKey(pieceId)) === "1";
  } catch {
    return false;
  }
}

export function dismissNudge(pieceId: string): void {
  try {
    window.localStorage.setItem(nudgeDismissedKey(pieceId), "1");
  } catch {
    /* ignore */
  }
}
