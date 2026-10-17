import { labelForUrl } from "@/lib/references";
import {
  isQuoteLineAt,
  shiftLinksForDelete,
  shiftLinksForInsert,
  type ApplyResult,
} from "./apply-events";
import { applyEvents } from "./apply-events";
import type { CharOrigin, EditEvent, TextLink } from "./types";

export const MAX_EVENTS_PER_BATCH = 2_000;
export const MAX_BATCH_BODY_BYTES = 1_000_000;
export const MAX_INSERT_CHARS = 200_000;
export const MAX_LINK_URL_CHARS = 2_048;

export class InvalidEventError extends Error {
  readonly reason = "invalid_event" as const;
  constructor(message: string) {
    super(message);
    this.name = "InvalidEventError";
  }
}

function isWholeNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && Number.isFinite(n);
}

function assertWholeNonNeg(n: unknown, field: string): asserts n is number {
  if (!isWholeNumber(n) || n < 0) {
    throw new InvalidEventError(`${field} must be a non-negative integer`);
  }
}

/**
 * Validate an http(s) URL for link events: parseable, http/https only, ≤2048 chars.
 */
export function assertHttpUrl(url: string): URL {
  if (url.length === 0 || url.length > MAX_LINK_URL_CHARS) {
    throw new InvalidEventError("link url length");
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new InvalidEventError("link url parse");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new InvalidEventError("link url protocol");
  }
  return parsed;
}

function originForInsertOrPaste(
  event: EditEvent,
  textBefore: string,
): CharOrigin {
  if (event.type === "paste") {
    return isQuoteLineAt(textBefore, event.pos) ? "quoted" : "pasted";
  }
  return "typed";
}

function applyReplace(
  text: string,
  origins: CharOrigin[],
  links: TextLink[],
  pos: number,
  removeLen: number,
  insertText: string,
  insertOrigin: CharOrigin,
): ApplyResult {
  let nextLinks = shiftLinksForDelete(links, pos, removeLen);
  let nextText = text.slice(0, pos) + text.slice(pos + removeLen);
  let nextOrigins = [
    ...origins.slice(0, pos),
    ...origins.slice(pos + removeLen),
  ];

  const tags: CharOrigin[] = Array.from(
    { length: insertText.length },
    () => insertOrigin,
  );
  nextText = nextText.slice(0, pos) + insertText + nextText.slice(pos);
  nextOrigins = [
    ...nextOrigins.slice(0, pos),
    ...tags,
    ...nextOrigins.slice(pos),
  ];
  nextLinks = shiftLinksForInsert(nextLinks, pos, insertText.length);
  return { text: nextText, origins: nextOrigins, links: nextLinks };
}

/**
 * Apply events starting from `initialText`, throwing {@link InvalidEventError}
 * if any event is out of range or a link event is not an exact URL→hostname swap.
 *
 * Origins for characters already in `initialText` are placeholders; callers that
 * need accurate share tags should rebuild with {@link applyEvents} from the full log.
 */
export function applyEventsStrict(
  initialText: string,
  events: readonly EditEvent[],
): ApplyResult {
  if (events.length > MAX_EVENTS_PER_BATCH) {
    throw new InvalidEventError("too many events");
  }

  let text = initialText;
  let origins: CharOrigin[] = Array.from(
    { length: initialText.length },
    () => "typed" as CharOrigin,
  );
  let links: TextLink[] = [];

  for (const event of events) {
    assertWholeNonNeg(event.t, "t");
    assertWholeNonNeg(event.pos, "pos");
    assertWholeNonNeg(event.len, "len");

    if (event.type === "delete") {
      if (event.len === 0) {
        throw new InvalidEventError("delete len");
      }
      if (event.pos + event.len > text.length) {
        throw new InvalidEventError("delete range");
      }
      text = text.slice(0, event.pos) + text.slice(event.pos + event.len);
      origins = [
        ...origins.slice(0, event.pos),
        ...origins.slice(event.pos + event.len),
      ];
      links = shiftLinksForDelete(links, event.pos, event.len);
      continue;
    }

    if (event.type === "link") {
      const url = event.url ?? "";
      assertHttpUrl(url);
      if (event.pos + event.len > text.length) {
        throw new InvalidEventError("link range");
      }
      if (text.slice(event.pos, event.pos + event.len) !== url) {
        throw new InvalidEventError("link replaced text");
      }
      if (event.text !== labelForUrl(url)) {
        throw new InvalidEventError("link label");
      }
      const next = applyReplace(
        text,
        origins,
        links,
        event.pos,
        event.len,
        event.text,
        "link",
      );
      text = next.text;
      origins = next.origins;
      links = next.links.filter(
        (l) =>
          l.end <= event.pos || l.start >= event.pos + event.text.length,
      );
      if (url.length > 0 && event.text.length > 0) {
        links.push({
          start: event.pos,
          end: event.pos + event.text.length,
          url,
        });
        links.sort((a, b) => a.start - b.start);
      }
      continue;
    }

    // insert | paste
    if (event.pos > text.length) {
      throw new InvalidEventError("insert pos");
    }
    if (typeof event.text !== "string") {
      throw new InvalidEventError("insert text");
    }
    if (event.text.length > MAX_INSERT_CHARS) {
      throw new InvalidEventError("insert too large");
    }
    const origin = originForInsertOrPaste(event, text);
    const tags: CharOrigin[] = Array.from(
      { length: event.text.length },
      () => origin,
    );
    text = text.slice(0, event.pos) + event.text + text.slice(event.pos);
    origins = [
      ...origins.slice(0, event.pos),
      ...tags,
      ...origins.slice(event.pos),
    ];
    links = shiftLinksForInsert(links, event.pos, event.text.length);
  }

  return { text, origins, links };
}

/** Lenient rebuild used only to backfill draft_text from already-stored batches. */
export function rebuildTextFromEvents(events: readonly EditEvent[]): string {
  return applyEvents(events).text;
}
