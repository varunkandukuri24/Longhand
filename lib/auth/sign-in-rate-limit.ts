import { db } from "@/db";
import { signInAttempts } from "@/db/schema";
import { and, count, eq, gt } from "drizzle-orm";
import { headers } from "next/headers";

/** Max magic-link emails per address in a rolling hour. */
export const SIGN_IN_EMAIL_LIMIT = 5;
/** Max magic-link emails per IP in a rolling hour. */
export const SIGN_IN_IP_LIMIT = 20;

const WINDOW_MS = 60 * 60 * 1000;

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

  const since = new Date(now.getTime() - WINDOW_MS);

  const [emailRow] = await db
    .select({ n: count() })
    .from(signInAttempts)
    .where(
      and(
        eq(signInAttempts.email, normalized),
        gt(signInAttempts.createdAt, since),
      ),
    );

  const [ipRow] = await db
    .select({ n: count() })
    .from(signInAttempts)
    .where(and(eq(signInAttempts.ip, ip), gt(signInAttempts.createdAt, since)));

  if (isOverSignInLimit(Number(emailRow?.n ?? 0), Number(ipRow?.n ?? 0))) {
    return false;
  }

  await db.insert(signInAttempts).values({
    email: normalized,
    ip,
    createdAt: now,
  });
  return true;
}
