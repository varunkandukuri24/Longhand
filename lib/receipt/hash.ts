import type { EditEvent } from "./types";

/** Genesis prevHash for the first batch of a session (64 zero hex chars). */
export const GENESIS_PREV_HASH = "0".repeat(64);

/** Event object with keys in the fixed canonical order for hashing. */
export type CanonicalEvent = {
  t: number;
  type: EditEvent["type"];
  pos: number;
  len: number;
  text: string;
  url?: string;
};

export function canonicalizeEvent(event: EditEvent): CanonicalEvent {
  const base: CanonicalEvent = {
    t: event.t,
    type: event.type,
    pos: event.pos,
    len: event.len,
    text: event.text,
  };
  if (event.type === "link" && typeof event.url === "string") {
    base.url = event.url;
  }
  return base;
}

/**
 * Canonical hash input:
 * `${prevHash}|${seq}|${JSON.stringify(events)}`
 * with every event keyed as t, type, pos, len, text (, url for link).
 */
export function batchHashInput(
  prevHash: string,
  seq: number,
  events: readonly EditEvent[],
): string {
  const canonical = events.map(canonicalizeEvent);
  return `${prevHash}|${seq}|${JSON.stringify(canonical)}`;
}

/**
 * Shared batch hasher. Pass Web Crypto or node:crypto as sha256Hex;
 * both must produce identical output for the same input.
 */
export async function hashBatch(
  prevHash: string,
  seq: number,
  events: readonly EditEvent[],
  sha256Hex: (utf8: string) => string | Promise<string>,
): Promise<string> {
  return sha256Hex(batchHashInput(prevHash, seq, events));
}
