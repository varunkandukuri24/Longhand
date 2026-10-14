export const DISPLAY_NAME_MAX_LEN = 80;

/** Trim and validate a display name. Returns null when empty/invalid. */
export function normalizeDisplayName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length === 0 || name.length > DISPLAY_NAME_MAX_LEN) {
    return null;
  }
  return name;
}
