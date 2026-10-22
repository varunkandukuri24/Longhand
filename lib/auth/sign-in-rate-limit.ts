import { headers } from "next/headers";
import { allow, countHits, recordHit } from "@/lib/rate-limit";

/** Max magic-link emails per address in a rolling hour. */
export const SIGN_IN_EMAIL_LIMIT = 5;
/** Max magic-link emails per IP in a rolling hour. */
export const SIGN_IN_IP_LIMIT = 20;

const WINDOW_MS = 60 * 60 * 1000;

export const SIGNIN_EMAIL_BUCKET = "signin_email";
export const SIGNIN_IP_BUCKET = "signin_ip";

export function normalizeSignInEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Pure limit check used by tests and the DB gate. */
export function isOverSignInLimit(
  emailCount: number,
  ipCount: number,
): boolean {
  return emailCount >= SIGN_IN_EMAIL_LIMIT || ipCount >= SIGN_IN_IP_LIMIT;
}

/**
 * Client IP from proxy headers (Caddy sets X-Forwarded-For).
 * Falls back to "unknown" so a missing header still shares one bucket.
 */
export async function clientIpFromHeaders(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = h.get("x-real-ip")?.trim();
  if (real) return real;
  return "unknown";
}

/**
 * Returns true when a sign-in email may be sent. Records the attempt only when
 * under the limit so blocked retries do not extend the window.
 */
export async function allowSignInAttempt(
  email: string,
  ip: string,
  now: Date = new Date(),
): Promise<boolean> {
  const normalized = normalizeSignInEmail(email);
  if (!normalized) return false;

  const emailCount = await countHits(
    SIGNIN_EMAIL_BUCKET,
    normalized,
    WINDOW_MS,
    now,
  );
  const ipCount = await countHits(SIGNIN_IP_BUCKET, ip, WINDOW_MS, now);
  if (isOverSignInLimit(emailCount, ipCount)) {
    return false;
  }

  await recordHit(SIGNIN_EMAIL_BUCKET, normalized, now);
  await recordHit(SIGNIN_IP_BUCKET, ip, now);
  return true;
}

export { allow };
