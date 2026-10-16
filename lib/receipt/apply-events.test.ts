import { describe, expect, it } from "vitest";
import {
  applyDiffToOrigins,
  diffText,
  eventsFromDiff,
} from "@/lib/editor/diff";
import { applyEvents } from "./apply-events";
import type { CharOrigin, EditEvent } from "./types";

type ScriptedEdit = {
  next: string;
  inputType?: string;
  t: number;
};

/** Apply the same diff→events pipeline the editor uses. */
function captureSession(
  edits: ScriptedEdit[],
  start = "",
): { events: EditEvent[]; final: string; origins: CharOrigin[] } {
  let text = start;
  let origins: CharOrigin[] = Array.from({ length: start.length }, () => "typed");
  const events: EditEvent[] = [];

  for (const edit of edits) {
    const diff = diffText(text, edit.next);
    if (diff.removed.length === 0 && diff.inserted.length === 0) {
      continue;
    }
    events.push(...eventsFromDiff(diff, edit.inputType, edit.t, text));
    origins = applyDiffToOrigins(origins, diff, edit.inputType, text);
    text = edit.next;
  }

  return { events, final: text, origins };
}

describe("applyEvents", () => {
  it("rebuilds normal typing", () => {
    const { events, final } = captureSession([
      { next: "H", t: 0 },
      { next: "He", t: 40 },
      { next: "Hel", t: 80 },
      { next: "Hell", t: 120 },
      { next: "Hello", t: 160 },
    ]);

    expect(applyEvents(events).text).toBe("Hello");
    expect(applyEvents(events).text).toBe(final);
  });

  it("rebuilds after backspace", () => {
    const { events, final } = captureSession([
      { next: "Hi", t: 0 },
      { next: "H", t: 50 },
      { next: "", t: 100 },
      { next: "Ok", t: 150 },
    ]);

    expect(applyEvents(events).text).toBe("Ok");
    expect(applyEvents(events).text).toBe(final);
  });

  it("rebuilds select-and-replace", () => {
    const { events, final } = captureSession([
      { next: "abcdef", t: 0 },
      // replace "cd" with "XY"
      { next: "abXYef", t: 100 },
    ]);

    expect(events).toEqual([
      { t: 0, type: "insert", pos: 0, len: 6, text: "abcdef" },
      { t: 100, type: "delete", pos: 2, len: 2, text: "cd" },
      { t: 100, type: "insert", pos: 2, len: 2, text: "XY" },
    ]);
    expect(applyEvents(events).text).toBe("abXYef");
    expect(applyEvents(events).text).toBe(final);
  });

  it("rebuilds paste as type paste", () => {
    const { events, final, origins } = captureSession([
      { next: "Hello ", t: 0 },
      {
        next: "Hello world from elsewhere",
        inputType: "insertFromPaste",
        t: 200,
      },
    ]);

    expect(events.at(-1)).toMatchObject({
      type: "paste",
      text: "world from elsewhere",
    });
    const rebuilt = applyEvents(events);
    expect(rebuilt.text).toBe(final);
    expect(rebuilt.origins).toEqual(origins);
    expect(origins.slice(6).every((o) => o === "pasted")).toBe(true);
    expect(origins.slice(0, 6).every((o) => o === "typed")).toBe(true);
  });

  it("tags paste on a quote line as quoted", () => {
    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 2, text: "> " },
      { t: 10, type: "paste", pos: 2, len: 4, text: "said" },
    ];
    const rebuilt = applyEvents(events);
    expect(rebuilt.text).toBe("> said");
    expect(rebuilt.origins).toEqual([
      "typed",
      "typed",
      "quoted",
      "quoted",
      "quoted",
      "quoted",
    ]);
  });

  it("tags quoted vs pasted origin through the editor pipeline", () => {
    const quoted = captureSession([
      { next: "> ", t: 0 },
      {
        next: "> quoted block",
        inputType: "insertFromPaste",
        t: 50,
      },
    ]);
    expect(applyEvents(quoted.events).origins).toEqual(quoted.origins);
    expect(quoted.origins.slice(2).every((o) => o === "quoted")).toBe(true);

    const pasted = captureSession([
      { next: "Hi ", t: 0 },
      {
        next: "Hi pasted block",
        inputType: "insertFromPaste",
        t: 50,
      },
    ]);
    expect(applyEvents(pasted.events).origins).toEqual(pasted.origins);
    expect(pasted.origins.slice(3).every((o) => o === "pasted")).toBe(true);
  });

  it("rebuilds paste then delete part of it", () => {
    const { events, final, origins } = captureSession([
      {
        next: "alpha beta gamma",
        inputType: "insertFromPaste",
        t: 0,
      },
      // delete " beta"
      { next: "alpha gamma", t: 300 },
    ]);

    const rebuilt = applyEvents(events);
    expect(rebuilt.text).toBe("alpha gamma");
    expect(rebuilt.text).toBe(final);
    expect(rebuilt.origins).toEqual(origins);
    expect(origins).toEqual(Array.from({ length: final.length }, () => "pasted"));
  });

  it("rebuilds undo after paste", () => {
    const { events, final } = captureSession([
      { next: "keep ", t: 0 },
      {
        next: "keep pasted block",
        inputType: "insertFromPaste",
        t: 100,
      },
      // undo restores pre-paste text (browser history undo)
      { next: "keep ", t: 200 },
    ]);

    expect(applyEvents(events).text).toBe("keep ");
    expect(applyEvents(events).text).toBe(final);
  });

  it("rebuilds a scripted session with paste and undo", () => {
    // Timestamps span ~2 minutes of writing (Done when: Phase 1).
    const { events, final } = captureSession([
      { next: "I ", t: 0 },
      { next: "I wrote ", t: 12_000 },
      { next: "I wrote this ", t: 28_000 },
      {
        next: "I wrote this by hand, mostly.",
        inputType: "insertFromPaste",
        t: 45_000,
      },
      { next: "I wrote this by hand.", t: 70_000 },
      {
        next: "I wrote this by hand. Extra pasted.",
        inputType: "insertFromPaste",
        t: 90_000,
      },
      // undo the second paste
      { next: "I wrote this by hand.", t: 95_000 },
      { next: "I wrote this by hand. Done.", t: 120_000 },
    ]);

    expect(final).toBe("I wrote this by hand. Done.");
    expect(applyEvents(events).text).toBe(final);
  });

  it("matches the final value after a long random edit sequence", () => {
    const alphabet = "abcdefghijklmnopqrstuvwxyz \n";
    let text = "";
    const edits: ScriptedEdit[] = [];
    let t = 0;

    for (let i = 0; i < 400; i += 1) {
      t += 10 + (i % 7);
      const kind = i % 11;

      if (kind === 0 && text.length > 0) {
        // backspace one
        edits.push({ next: text.slice(0, -1), t });
      } else if (kind === 1 && text.length > 4) {
        // select-and-replace a middle slice
        const start = Math.floor(text.length / 4);
        const end = start + 2;
        const next =
          text.slice(0, start) +
          alphabet[(i * 3) % alphabet.length] +
          alphabet[(i * 5) % alphabet.length] +
          text.slice(end);
        edits.push({ next, t });
      } else if (kind === 2) {
        // paste a short block
        const block = `P${i}x`;
        const at = text.length > 0 ? i % (text.length + 1) : 0;
        const next = text.slice(0, at) + block + text.slice(at);
        edits.push({ next, inputType: "insertFromPaste", t });
      } else if (kind === 3 && text.length > 6) {
        // undo-like: delete a pasted-looking suffix chunk
        const cut = Math.min(3, text.length);
        edits.push({ next: text.slice(0, text.length - cut), t });
      } else if (kind === 4 && text.length > 8) {
        // drop-style paste in the middle
        const at = Math.floor(text.length / 2);
        const next = text.slice(0, at) + "DROP" + text.slice(at);
        edits.push({ next, inputType: "insertFromDrop", t });
      } else {
        // typed character
        const ch = alphabet[i % alphabet.length];
        const at = text.length > 0 ? i % (text.length + 1) : 0;
        const next = text.slice(0, at) + ch + text.slice(at);
        edits.push({ next, t });
      }

      text = edits[edits.length - 1].next;
    }

    const { events, final, origins } = captureSession(edits);
    expect(final).toBe(text);
    const rebuilt = applyEvents(events);
    expect(rebuilt.text).toBe(final);
    expect(rebuilt.origins).toEqual(origins);
  });
});

describe("link events", () => {
  it("shortens a URL with a link event", () => {
    const url = "https://www.theatlantic.com/ideas/x";
    const label = "theatlantic.com";
    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: url.length, text: url },
      { t: 10, type: "insert", pos: url.length, len: 1, text: " " },
      {
        t: 20,
        type: "link",
        pos: 0,
        len: url.length,
        text: label,
        url,
      },
    ];
    const shortened = applyEvents(events);
    expect(shortened.text).toBe(`${label} `);
    expect(shortened.links).toEqual([
      { start: 0, end: label.length, url },
    ]);
    expect(
      shortened.origins.slice(0, label.length).every((o) => o === "link"),
    ).toBe(true);
  });

  it("keeps origins and links in sync when typing before, after and around a link", () => {
    const url = "https://example.com/a";
    const label = "example.com";
    const base: EditEvent[] = [
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
    const after = applyEvents([
      ...base,
      { t: 20, type: "insert", pos: 0, len: 3, text: "Hi " },
      { t: 30, type: "insert", pos: 3 + label.length, len: 2, text: " !" },
    ]);
    expect(after.text).toBe(`Hi ${label} !`);
    expect(after.links).toEqual([
      { start: 3, end: 3 + label.length, url },
    ]);
    expect(after.origins).toHaveLength(after.text.length);
    expect(after.origins.slice(3, 3 + label.length).every((o) => o === "link")).toBe(
      true,
    );

    const deleted = applyEvents([
      ...base,
      { t: 20, type: "insert", pos: 0, len: 3, text: "Hi " },
      {
        t: 40,
        type: "delete",
        pos: 3,
        len: label.length,
        text: label,
      },
    ]);
    expect(deleted.text).toBe("Hi ");
    expect(deleted.links).toEqual([]);
  });
});
