import type { CharOrigin, EditEvent } from "./types";

export type ApplyResult = {
  text: string;
  origins: CharOrigin[];
};

function originForEvent(event: EditEvent): CharOrigin {
  if (event.type === "paste") {
    return "pasted";
  }
  return "typed";
}

/** Rebuild document text and per-character origins from the event log. */
export function applyEvents(events: readonly EditEvent[]): ApplyResult {
  let text = "";
  let origins: CharOrigin[] = [];

  for (const event of events) {
    if (event.type === "delete") {
      text = text.slice(0, event.pos) + text.slice(event.pos + event.len);
      origins = [
        ...origins.slice(0, event.pos),
        ...origins.slice(event.pos + event.len),
      ];
      continue;
    }

    const origin = originForEvent(event);
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
  }

  return { text, origins };
}
