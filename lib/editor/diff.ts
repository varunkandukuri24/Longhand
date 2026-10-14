import { isQuoteLineAt } from "@/lib/receipt/apply-events";
import type { CharOrigin, EditEvent, EventType } from "@/lib/receipt/types";

export type TextDiff = {
  pos: number;
  removed: string;
  inserted: string;
};

/** Find the single changed middle between prev and next via common prefix/suffix. */
export function diffText(prev: string, next: string): TextDiff {
  let prefix = 0;
  const minLen = Math.min(prev.length, next.length);
  while (prefix < minLen && prev[prefix] === next[prefix]) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < prev.length - prefix &&
    suffix < next.length - prefix &&
    prev[prev.length - 1 - suffix] === next[next.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  return {
    pos: prefix,
    removed: prev.slice(prefix, prev.length - suffix),
    inserted: next.slice(prefix, next.length - suffix),
  };
}

export function originForInputType(inputType: string | undefined): CharOrigin {
  if (inputType === "insertFromPaste" || inputType === "insertFromDrop") {
    return "pasted";
  }
  return "typed";
}

/**
 * Origin for an insert at `pos` in `textBefore`. Paste on a `> ` line is quoted.
 */
export function originForInsert(
  inputType: string | undefined,
  textBefore: string,
  pos: number,
): CharOrigin {
  const base = originForInputType(inputType);
  if (base === "pasted" && isQuoteLineAt(textBefore, pos)) {
    return "quoted";
  }
  return base;
}

export function eventTypeForOrigin(origin: CharOrigin): EventType {
  // Quoted text is still a paste event; rebuild tags it via the quote line.
  return origin === "pasted" || origin === "quoted" ? "paste" : "insert";
}

/** Emit delete and/or insert|paste events from a text diff. */
export function eventsFromDiff(
  diff: TextDiff,
  inputType: string | undefined,
  t: number,
  textBefore = "",
): EditEvent[] {
  const events: EditEvent[] = [];

  if (diff.removed.length > 0) {
    events.push({
      t,
      type: "delete",
      pos: diff.pos,
      len: diff.removed.length,
      text: diff.removed,
    });
  }

  if (diff.inserted.length > 0) {
    const origin = originForInsert(inputType, textBefore, diff.pos);
    events.push({
      t,
      type: eventTypeForOrigin(origin),
      pos: diff.pos,
      len: diff.inserted.length,
      text: diff.inserted,
    });
  }

  return events;
}

/** Update the per-character origin array from the same diff used for events. */
export function applyDiffToOrigins(
  origins: readonly CharOrigin[],
  diff: TextDiff,
  inputType: string | undefined,
  textBefore = "",
): CharOrigin[] {
  const next = origins.slice();
  const origin = originForInsert(inputType, textBefore, diff.pos);
  const tags: CharOrigin[] = Array.from(
    { length: diff.inserted.length },
    () => origin,
  );
  next.splice(diff.pos, diff.removed.length, ...tags);
  return next;
}
