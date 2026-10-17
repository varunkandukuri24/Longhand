/** Reserved subdomain labels that must never be used as writer handles. */
export const RESERVED_HANDLES = new Set([
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "help",
  "about",
  "blog",
  "static",
  "assets",
  "cdn",
  "status",
  "support",
  "longhand",
  "auth",
  "signin",
  "login",
  "signup",
  "dashboard",
  "settings",
  "write",
  "p",
  "u",
  "docs",
  "dev",
  "staging",
  "root",
]);

const HANDLE_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Lowercase, collapse non [a-z0-9] runs to '-', trim hyphens, max 30 chars.
 */
export function normalizeHandle(raw: string): string {
  const collapsed = raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return collapsed.slice(0, 30).replace(/-+$/g, "");
}

export type HandleValidation =
  | { ok: true; handle: string }
  | { ok: false; error: string };

/**
 * Validate a handle candidate. Expects lowercase form (or lowercases first).
 * Rules: 3–30 chars, [a-z0-9-], no leading/trailing or double hyphen, not reserved.
 */
export function validateHandle(raw: string): HandleValidation {
  const handle = raw.toLowerCase().trim();
  if (handle.length < 3 || handle.length > 30) {
    return { ok: false, error: "length" };
  }
  if (!HANDLE_RE.test(handle)) {
    return { ok: false, error: "format" };
  }
  if (RESERVED_HANDLES.has(handle)) {
    return { ok: false, error: "reserved" };
  }
  return { ok: true, handle };
}

/**
 * Suggest a valid handle from a display name (may still be taken).
 */
export function suggestHandle(displayName: string): string {
  let handle = normalizeHandle(displayName);
  if (handle.length < 3) {
    handle = "writer";
  }
  if (RESERVED_HANDLES.has(handle)) {
    const suffix = "-2";
    handle = `${handle.slice(0, 30 - suffix.length)}${suffix}`;
  }
  const checked = validateHandle(handle);
  if (checked.ok) {
    return checked.handle;
  }
  return "writer";
}
