import { describe, expect, it } from "vitest";
import { captureEdit, type PendingLink } from "./capture-events";
import { diffText } from "./diff";
import { applyEvents } from "@/lib/receipt/apply-events";
import { shortenRemainingUrls } from "@/lib/receipt/shorten";
import { labelForUrl } from "@/lib/references";
import type { EditEvent } from "@/lib/receipt/types";

function typeChars(text: string, startT = 0): EditEvent[] {
  const events: EditEvent[] = [];
  let t = startT;
  let built = "";
  for (const ch of text) {
    const prev = built;
    built += ch;
    const diff = diffText(prev, built);
    const captured = captureEdit({
      prev,
      next: built,
      priorEvents: events,
      pendingLink: null,
      t,
      inputType: "insertText",
      diff,
    });
    expect(captured.diverged).toBe(false);
    events.length = 0;
    events.push(...captured.events);
    t += 40;
  }
  return events;
}

describe("captureEdit with pendingLink", () => {
  it("types a URL, shortens on space, keeps caret after trailing words, rebuild matches", () => {
    const url = "https://www.theatlantic.com/ideas/x/";
    const label = labelForUrl(url);
    expect(label).toBe("theatlantic.com");

    // "see " + url
    let events = typeChars(`see ${url}`);
    let text = `see ${url}`;
    expect(applyEvents(events).text).toBe(text);

    // pendingLink replacement (as execCommand would produce), then space, then "now"
    const pending: PendingLink = {
      url,
      label,
      start: 4,
      end: 4 + url.length,
    };
    const afterLink = `see ${label}`;
    let captured = captureEdit({
      prev: text,
      next: afterLink,
      priorEvents: events,
      pendingLink: pending,
      t: 10_000,
      inputType: "insertText",
      diff: diffText(text, afterLink),
    });
    expect(captured.diverged).toBe(false);
    expect(captured.pendingLink).toBeNull();
    expect(captured.text).toBe(afterLink);
    expect(captured.links).toEqual([
      { start: 4, end: 4 + label.length, url },
    ]);
    events = captured.events;
    text = afterLink;

    // space
    captured = captureEdit({
      prev: text,
      next: `${text} `,
      priorEvents: events,
      pendingLink: null,
      t: 10_040,
      inputType: "insertText",
      diff: diffText(text, `${text} `),
    });
    expect(captured.diverged).toBe(false);
    events = captured.events;
    text = `${text} `;

    // "now"
    for (const ch of "now") {
      const next = text + ch;
      captured = captureEdit({
        prev: text,
        next,
        priorEvents: events,
        pendingLink: null,
        t: 10_100,
        inputType: "insertText",
        diff: diffText(text, next),
      });
      expect(captured.diverged).toBe(false);
      events = captured.events;
      text = next;
    }

    expect(text).toBe("see theatlantic.com now");
    const rebuilt = applyEvents(events);
    expect(rebuilt.text).toBe(text);
    expect(rebuilt.links).toEqual([
      { start: 4, end: 4 + label.length, url },
    ]);
    // Caret would sit after "now"
    expect(text.endsWith("now")).toBe(true);

    // Publish gate: rebuilt text must match the textarea; no raw URLs left.
    expect(rebuilt.text).toBe("see theatlantic.com now");
    const published = shortenRemainingUrls(rebuilt.text, rebuilt.links);
    expect(published.text).toBe(rebuilt.text);
    expect(published.links).toEqual(rebuilt.links);
  });

  it("drops a link when editing inside the label", () => {
    const url = "https://example.com/a";
    const label = "example.com";
    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: url.length, text: url },
      {
        t: 10,
        type: "link",
        pos: 0,
        len: url.length,
        text: label,
        url,
      },
    ];
    const mid = Math.floor(label.length / 2);
    const prev = label;
    const next = `${label.slice(0, mid)}X${label.slice(mid)}`;
    const captured = captureEdit({
      prev,
      next,
      priorEvents: events,
      pendingLink: null,
      t: 20,
      inputType: "insertText",
      diff: diffText(prev, next),
    });
    expect(captured.diverged).toBe(false);
    expect(captured.links).toEqual([]);
    expect(captured.text).toBe(next);
  });
});
