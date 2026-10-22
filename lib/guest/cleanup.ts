import { db } from "@/db";
import { guests } from "@/db/schema";
import { and, isNull, lt } from "drizzle-orm";
import { GUEST_TTL_MS } from "./limits";

const CLEANUP_MIN_INTERVAL_MS = 60 * 60 * 1000;

let lastGuestCleanupAt = 0;

/** Delete unclaimed guests older than 7 days. Pieces, sessions and batches cascade. */
export async function deleteUnclaimedGuestsOlderThan(
  cutoff: Date,
): Promise<number> {
  const deleted = await db
    .delete(guests)
    .where(and(lt(guests.createdAt, cutoff), isNull(guests.claimedBy)))
    .returning({ id: guests.id });
  return deleted.length;
}

export async function maybeCleanupGuests(now: Date = new Date()): Promise<void> {
  const t = now.getTime();
  if (t - lastGuestCleanupAt < CLEANUP_MIN_INTERVAL_MS) return;
  lastGuestCleanupAt = t;
  await deleteUnclaimedGuestsOlderThan(new Date(t - GUEST_TTL_MS));
}

/** Test helper: allow the next cleanup to run immediately. */
export function resetGuestCleanupThrottle(): void {
  lastGuestCleanupAt = 0;
}
