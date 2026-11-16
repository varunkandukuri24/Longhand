import { wordCount } from "@/lib/receipt/compute-receipt";

export const GUEST_BATCH_MIN_INTERVAL_MS = 1_000;

/** Words before the guest receipt-so-far card appears. */
export const GUEST_RECEIPT_WORDS = 25;

export function exceedsGuestLimit(
  text: string,
  wordLimit: number,
  charLimit: number,
): boolean {
  return text.length > charLimit || wordCount(text) > wordLimit;
}

export function atGuestLimit(
  text: string,
  wordLimit: number,
  charLimit: number,
): boolean {
  return text.length >= charLimit || wordCount(text) >= wordLimit;
}
