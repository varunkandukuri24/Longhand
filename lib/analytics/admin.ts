/** Emails listed in ADMIN_EMAILS may open /stats. */

export function parseAdminEmails(
  raw: string | undefined | null = process.env.ADMIN_EMAILS,
): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminEmail(
  email: string | null | undefined,
  raw: string | undefined | null = process.env.ADMIN_EMAILS,
): boolean {
  if (!email) return false;
  return parseAdminEmails(raw).has(email.trim().toLowerCase());
}
