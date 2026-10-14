/** A batch is delayed if it was created more than 2 minutes before send. */
export const DELAY_THRESHOLD_MS = 2 * 60 * 1000;

export function isBatchDelayed(createdAt: number, sentAt = Date.now()): boolean {
  return sentAt - createdAt > DELAY_THRESHOLD_MS;
}
