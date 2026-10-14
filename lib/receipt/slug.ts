const SLUG_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

/** Six random a-z0-9 characters for slug uniqueness. */
export function randomSlugSuffix(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += SLUG_CHARS[bytes[i]! % SLUG_CHARS.length];
  }
  return out;
}

/** Title slug base + random suffix, e.g. "my-essay-a3k9xm". */
export function makePieceSlug(title: string, suffix = randomSlugSuffix()): string {
  const base =
    title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "piece";
  return `${base}-${suffix}`;
}
