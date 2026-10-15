/** Parse #RRGGBB into 0–255 channels. */
export function parseHex(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "").trim();
  if (clean.length !== 6) {
    throw new Error(`invalid hex color: ${hex}`);
  }
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

/** Format channels as #RRGGBB. */
export function formatHex(r: number, g: number, b: number): string {
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/**
 * Mix base with tint at strength (0–1).
 * result = base * (1 - strength) + tint * strength
 */
export function mixHex(base: string, tint: string, strength: number): string {
  const a = parseHex(base);
  const b = parseHex(tint);
  const t = Math.max(0, Math.min(1, strength));
  return formatHex(
    a.r * (1 - t) + b.r * t,
    a.g * (1 - t) + b.g * t,
    a.b * (1 - t) + b.b * t,
  );
}
