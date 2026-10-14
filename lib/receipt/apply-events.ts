import type { EditEvent } from "./types";

/** Rebuild document text by replaying the event log from empty. */
export function applyEvents(events: readonly EditEvent[]): string {
  let text = "";

  for (const event of events) {
    if (event.type === "delete") {
      text = text.slice(0, event.pos) + text.slice(event.pos + event.len);
      continue;
    }

    text = text.slice(0, event.pos) + event.text + text.slice(event.pos);
  }

  return text;
}
