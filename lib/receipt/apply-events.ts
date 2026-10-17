import type { CharOrigin, EditEvent, TextLink } from "./types";

export type ApplyResult = {
  text: string;
  origins: CharOrigin[];
  links: TextLink[];
};

/** True when `pos` sits on a markdown quote line (`> `…). */
export function isQuoteLineAt(text: string, pos: number): boolean {
  const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
  return text.slice(lineStart, lineStart + 2) === "> ";
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

/**
 * Insert at `pos`: spans after/at start shift right. An insert strictly
 * inside a span (not at its edges) drops that link.
 */
/** Exported for strict apply. */
export function shiftLinksForInsert(
  links: readonly TextLink[],
  pos: number,
  insertedLen: number,
): TextLink[] {
  if (insertedLen === 0) return links.slice();
  const next: TextLink[] = [];
  for (const link of links) {
    if (pos < link.start) {
      next.push({
        start: link.start + insertedLen,
        end: link.end + insertedLen,
        url: link.url,
      });
    } else if (pos === link.start) {
      // Insert before the label — shift it.
      next.push({
        start: link.start + insertedLen,
        end: link.end + insertedLen,
        url: link.url,
      });
    } else if (pos >= link.end) {
      next.push({ ...link });
    }
    // else start < pos < end → drop (edit inside the label)
  }
  return next;
}

/**
 * Delete [pos, pos+len): spans after shift left; any overlap drops the span.
 */
export function shiftLinksForDelete(
  links: readonly TextLink[],
  pos: number,
  deleteLen: number,
): TextLink[] {
  if (deleteLen === 0) return links.slice();
  const delEnd = pos + deleteLen;
  const next: TextLink[] = [];
  for (const link of links) {
    if (delEnd <= link.start) {
      next.push({
        start: link.start - deleteLen,
        end: link.end - deleteLen,
        url: link.url,
      });
    } else if (pos >= link.end) {
      next.push({ ...link });
    }
    // else overlap → drop
  }
  return next;
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

/** Rebuild document text, origins and shortened-link spans from the event log. */
export function applyEvents(events: readonly EditEvent[]): ApplyResult {
  let text = "";
  let origins: CharOrigin[] = [];
  let links: TextLink[] = [];

  for (const event of events) {
    if (event.type === "delete") {
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
      const label = event.text;
      const replaced = applyReplace(
        text,
        origins,
        links,
        event.pos,
        event.len,
        label,
        "link",
      );
      text = replaced.text;
      origins = replaced.origins;
      links = replaced.links.filter(
        (l) => l.end <= event.pos || l.start >= event.pos + label.length,
      );
      if (url.length > 0 && label.length > 0) {
        links.push({
          start: event.pos,
          end: event.pos + label.length,
          url,
        });
        links.sort((a, b) => a.start - b.start);
      }
      continue;
    }

    // insert | paste
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
