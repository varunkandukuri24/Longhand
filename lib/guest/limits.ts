import { wordCount } from "@/lib/receipt/compute-receipt";

export const GUEST_WORD_LIMIT = 500;
export const GUEST_CHAR_LIMIT = 4_000;
export const GUEST_NUDGE_WORDS = 50;
export const GUEST_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const GUEST_CREATE_PER_IP = 3;
export const GUEST_CREATE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const GUEST_BATCH_PER_IP = 600;
export const GUEST_BATCH_WINDOW_MS = 60 * 60 * 1000;
export const GUEST_BATCH_MIN_INTERVAL_MS = 1_000;

export function exceedsGuestLimit(text: string): boolean {
  return text.length > GUEST_CHAR_LIMIT || wordCount(text) > GUEST_WORD_LIMIT;
}

export function atGuestLimit(text: string): boolean {
  return text.length >= GUEST_CHAR_LIMIT || wordCount(text) >= GUEST_WORD_LIMIT;
}
