import {
  atGuestLimit as atGuestLimitWith,
  exceedsGuestLimit as exceedsGuestLimitWith,
} from "./limit-checks";

export { GUEST_BATCH_MIN_INTERVAL_MS } from "./limit-checks";

/** Parse a positive integer from the environment, or return the default. */
function envPositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return fallback;
  return n;
}

const previewScale = process.env.VERCEL_ENV === "preview" ? 10 : 1;

export const GUEST_WORD_LIMIT = envPositiveInt("GUEST_WORD_LIMIT", 500);
export const GUEST_CHAR_LIMIT = envPositiveInt("GUEST_CHAR_LIMIT", 4_000);
export const GUEST_NUDGE_WORDS = envPositiveInt("GUEST_NUDGE_WORDS", 50);
export const GUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const GUEST_CREATE_PER_IP =
  envPositiveInt("GUEST_CREATE_PER_IP_DAY", 20) * previewScale;
export const GUEST_CREATE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const GUEST_BATCH_PER_IP =
  envPositiveInt("GUEST_BATCH_PER_IP_HOUR", 2_000) * previewScale;
export const GUEST_BATCH_WINDOW_MS = 60 * 60 * 1000;

export function exceedsGuestLimit(
  text: string,
  wordLimit: number = GUEST_WORD_LIMIT,
  charLimit: number = GUEST_CHAR_LIMIT,
): boolean {
  return exceedsGuestLimitWith(text, wordLimit, charLimit);
}

export function atGuestLimit(
  text: string,
  wordLimit: number = GUEST_WORD_LIMIT,
  charLimit: number = GUEST_CHAR_LIMIT,
): boolean {
  return atGuestLimitWith(text, wordLimit, charLimit);
}
