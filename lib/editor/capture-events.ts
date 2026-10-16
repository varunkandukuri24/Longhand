import { eventsFromDiff, type TextDiff } from "@/lib/editor/diff";
import { applyEvents } from "@/lib/receipt/apply-events";
import type { CharOrigin, EditEvent, TextLink } from "@/lib/receipt/types";

export type PendingLink = {
  url: string;
  label: string;
  start: number;
  end: number;
};

/**
 * Turn a text diff into events. When `pendingLink` matches a URL→label
 * replacement, record a single `link` event instead of delete+insert.
 */
export function eventsForDiff(
  diff: TextDiff,
  inputType: string | undefined,
  t: number,
  textBefore: string,
  pendingLink: PendingLink | null,
): { events: EditEvent[]; consumedPending: boolean } {
  if (
    pendingLink &&
    diff.pos === pendingLink.start &&
    diff.removed ===
      textBefore.slice(pendingLink.start, pendingLink.end) &&
    diff.inserted === pendingLink.label
  ) {
    return {
      events: [
        {
          t,
          type: "link",
          pos: pendingLink.start,
          len: pendingLink.end - pendingLink.start,
          text: pendingLink.label,
          url: pendingLink.url,
        },
      ],
      consumedPending: true,
    };
  }

  return {
    events: eventsFromDiff(diff, inputType, t, textBefore),
    consumedPending: false,
  };
}

export type CaptureResult = {
  events: EditEvent[];
  text: string;
  origins: CharOrigin[];
  links: TextLink[];
  pendingLink: PendingLink | null;
  /** True when the rebuild diverged from `next` (should never happen). */
  diverged: boolean;
};

/** Append events for one edit and rebuild origins/links from the full log. */
export function captureEdit(args: {
  prev: string;
  next: string;
  priorEvents: readonly EditEvent[];
  pendingLink: PendingLink | null;
  t: number;
  inputType?: string;
  diff: TextDiff;
}): CaptureResult {
  const { events: newEvents } = eventsForDiff(
    args.diff,
    args.inputType,
    args.t,
    args.prev,
    args.pendingLink,
  );
  const events = [...args.priorEvents, ...newEvents];
  const rebuilt = applyEvents(events);
  return {
    events,
    text: rebuilt.text,
    origins: rebuilt.origins,
    links: rebuilt.links,
    // Always clear after one capture attempt so a missed match cannot stick.
    pendingLink: null,
    diverged: rebuilt.text !== args.next,
  };
}
