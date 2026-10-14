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

export function eventTypeForOrigin(origin: CharOrigin): EventType {
  return origin === "pasted" ? "paste" : "insert";
}

/** Emit delete and/or insert|paste events from a text diff. */
export function eventsFromDiff(
  diff: TextDiff,
  inputType: string | undefined,
  t: number,
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
    const origin = originForInputType(inputType);
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
): CharOrigin[] {
  const next = origins.slice();
  const tags: CharOrigin[] = Array.from(
    { length: diff.inserted.length },
    () => originForInputType(inputType),
  );
  next.splice(diff.pos, diff.removed.length, ...tags);
  return next;
}
