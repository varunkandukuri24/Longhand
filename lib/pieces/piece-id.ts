const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** True when `value` is a canonical UUID string (piece ids). */
export function isPieceId(value: string): boolean {
  return UUID_RE.test(value);
}
