import { createHmac } from "node:crypto";
import { db } from "@/db";
import { rateLimitHits } from "@/db/schema";
import { and, count, eq, gt, lt } from "drizzle-orm";

const HIT_TTL_MS = 24 * 60 * 60 * 1000;
const CLEANUP_MIN_INTERVAL_MS = 60 * 1000;

let lastHitCleanupAt = 0;

export function hashRateLimitKey(rawKey: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not set");
  }
  return createHmac("sha256", secret).update(rawKey, "utf8").digest("hex");
}

export async function countHits(
  bucket: string,
  rawKey: string,
  windowMs: number,
  now: Date = new Date(),
): Promise<number> {
  const keyHash = hashRateLimitKey(rawKey);
  const since = new Date(now.getTime() - windowMs);
  const [row] = await db
    .select({ n: count() })
    .from(rateLimitHits)
    .where(
      and(
        eq(rateLimitHits.bucket, bucket),
        eq(rateLimitHits.keyHash, keyHash),
        gt(rateLimitHits.createdAt, since),
      ),
    );
  return Number(row?.n ?? 0);
}

export async function recordHit(
  bucket: string,
  rawKey: string,
  now: Date = new Date(),
): Promise<void> {
  await db.insert(rateLimitHits).values({
    bucket,
    keyHash: hashRateLimitKey(rawKey),
    createdAt: now,
  });
}

/**
 * Returns true when this hit is under the limit, and records it.
 * Blocked retries are not stored, so they do not extend the window.
 */
export async function allow(
  bucket: string,
  rawKey: string,
  limit: number,
  windowMs: number,
  now: Date = new Date(),
): Promise<boolean> {
  await maybeCleanupRateLimitHits(now);
  const n = await countHits(bucket, rawKey, windowMs, now);
  if (n >= limit) return false;
  await recordHit(bucket, rawKey, now);
  return true;
}

export async function deleteOldRateLimitHits(
  now: Date = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - HIT_TTL_MS);
  const deleted = await db
    .delete(rateLimitHits)
    .where(lt(rateLimitHits.createdAt, cutoff))
    .returning({ id: rateLimitHits.id });
  return deleted.length;
}

export async function maybeCleanupRateLimitHits(now: Date = new Date()): Promise<void> {
  const t = now.getTime();
  if (t - lastHitCleanupAt < CLEANUP_MIN_INTERVAL_MS) return;
  lastHitCleanupAt = t;
  await deleteOldRateLimitHits(now);
}

/** Test helper: allow the next cleanup to run immediately. */
export function resetRateLimitCleanupThrottle(): void {
  lastHitCleanupAt = 0;
}
