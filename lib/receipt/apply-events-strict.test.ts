import { describe, expect, it } from "vitest";
import {
  applyEventsStrict,
  assertHttpUrl,
  InvalidEventError,
  MAX_INSERT_CHARS,
} from "./apply-events-strict";
import type { EditEvent } from "./types";

function insert(t: number, pos: number, text: string): EditEvent {
  return { t, type: "insert", pos, len: 0, text };
}

function link(
  t: number,
  pos: number,
  url: string,
  label: string,
): EditEvent {
  return { t, type: "link", pos, len: url.length, text: label, url };
}

describe("applyEventsStrict", () => {
  it("refuses a link label that contains spaces", () => {
    const url = "https://example.com/x";
    const text = url;
    expect(() =>
      applyEventsStrict(text, [
        link(0, 0, url, "not a hostname label with spaces"),
      ]),
    ).toThrow(InvalidEventError);
  });

  it("refuses a label that does not match its url", () => {
    const url = "https://example.com/path";
    expect(() =>
      applyEventsStrict(url, [link(0, 0, url, "evil.com")]),
    ).toThrow(InvalidEventError);
  });

  it("refuses javascript: and data: urls", () => {
    expect(() => assertHttpUrl("javascript:alert(1)")).toThrow(
      InvalidEventError,
    );
    expect(() => assertHttpUrl("data:text/html,hi")).toThrow(InvalidEventError);
  });

  it("refuses out-of-range pos", () => {
    expect(() =>
      applyEventsStrict("hi", [insert(0, 99, "x")]),
    ).toThrow(InvalidEventError);
    expect(() =>
      applyEventsStrict("hi", [
        { t: 0, type: "delete", pos: 0, len: 5, text: "" },
      ]),
    ).toThrow(InvalidEventError);
  });

  it("refuses delete with len 0", () => {
    expect(() =>
      applyEventsStrict("hi", [
        { t: 0, type: "delete", pos: 0, len: 0, text: "" },
      ]),
    ).toThrow(InvalidEventError);
  });

  it("refuses oversized insert", () => {
    expect(() =>
      applyEventsStrict("", [insert(0, 0, "a".repeat(MAX_INSERT_CHARS + 1))]),
    ).toThrow(InvalidEventError);
  });

  it("accepts a normal type → paste → shorten flow", () => {
    const url = "https://www.theatlantic.com/ideas/x";
    const label = "theatlantic.com";
    let state = applyEventsStrict("", [
      insert(0, 0, "See "),
      insert(10, 4, url),
      insert(20, 4 + url.length, " "),
    ]);
    expect(state.text).toBe(`See ${url} `);
    state = applyEventsStrict(state.text, [
      link(30, 4, url, label),
    ]);
    expect(state.text).toBe(`See ${label} `);
    expect(state.links).toEqual([
      { start: 4, end: 4 + label.length, url },
    ]);
  });
});
