import { describe, expect, it } from "vitest";
import { applyEvents } from "./apply-events";
import {
  ACTIVE_GAP_MAX_MS,
  CHARS_PER_WORD,
  FAST_STRETCH_WINDOW_MS,
  FAST_STRETCH_WPM,
  UNIFORM_RUN_MIN_LENGTH,
  activeWritingTimeMs,
  computeReceipt,
  elapsedSpanMs,
  fastStretchCountForEvents,
  liveBatchesFromEvents,
  originShares,
  typedInsertChars,
  uniformTypingRunCount,
  wordCount,
} from "./compute-receipt";
import type { EditEvent, ReceiptBatchInput } from "./types";

const DAY_MS = 86_400_000;

function batch(
  partial: Partial<ReceiptBatchInput> & {
    sessionId: string;
    events: EditEvent[];
  },
): ReceiptBatchInput {
  return {
    sessionStartedAt: partial.sessionStartedAt ?? 0,
    serverReceivedAt: partial.serverReceivedAt ?? 0,
    delayed: partial.delayed ?? false,
    sessionId: partial.sessionId,
    events: partial.events,
  };
}

function typedChars(text: string, startT: number, intervalMs: number): EditEvent[] {
  const events: EditEvent[] = [];
  let t = startT;
  let pos = 0;
  for (const ch of text) {
    events.push({ t, type: "insert", pos, len: 1, text: ch });
    pos += 1;
    t += intervalMs;
  }
  return events;
}

describe("activeWritingTimeMs", () => {
  it("sums gaps under 60s and ignores a 2-hour break in one session", () => {
    const twoHours = 2 * 60 * 60 * 1000;
    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 1, text: "a" },
      { t: 1_000, type: "insert", pos: 1, len: 1, text: "b" },
      { t: 1_000 + twoHours, type: "insert", pos: 2, len: 1, text: "c" },
      { t: 1_000 + twoHours + 500, type: "insert", pos: 3, len: 1, text: "d" },
    ];
    const batches = [batch({ sessionId: "s1", events })];
    // 1000 + 500; the 2h gap is idle
    expect(activeWritingTimeMs(batches)).toBe(1_500);
    expect(twoHours).toBeGreaterThan(ACTIVE_GAP_MAX_MS);
  });

  it("adds active time across sessions without spanning the idle between them", () => {
    const batches = [
      batch({
        sessionId: "s1",
        events: [
          { t: 0, type: "insert", pos: 0, len: 1, text: "a" },
          { t: 2_000, type: "insert", pos: 1, len: 1, text: "b" },
        ],
      }),
      batch({
        sessionId: "s2",
        events: [
          { t: 0, type: "insert", pos: 2, len: 1, text: "c" },
          { t: 3_000, type: "insert", pos: 3, len: 1, text: "d" },
        ],
      }),
    ];
    expect(activeWritingTimeMs(batches)).toBe(5_000);
  });
});

describe("elapsedSpanMs and sessionCount", () => {
  it("spans first session start to last batch server time across three days", () => {
    const day0 = Date.UTC(2026, 0, 1, 12, 0, 0);
    const day1 = day0 + DAY_MS;
    const day2 = day0 + 2 * DAY_MS;
    const batches = [
      batch({
        sessionId: "s1",
        sessionStartedAt: day0,
        serverReceivedAt: day0 + 60_000,
        events: [{ t: 0, type: "insert", pos: 0, len: 1, text: "a" }],
      }),
      batch({
        sessionId: "s2",
        sessionStartedAt: day1,
        serverReceivedAt: day1 + 30_000,
        events: [{ t: 0, type: "insert", pos: 1, len: 1, text: "b" }],
      }),
      batch({
        sessionId: "s3",
        sessionStartedAt: day2,
        serverReceivedAt: day2 + 90_000,
        events: [{ t: 0, type: "insert", pos: 2, len: 1, text: "c" }],
      }),
    ];
    const receipt = computeReceipt(batches, "abc");
    expect(receipt.sessionCount).toBe(3);
    expect(elapsedSpanMs(batches)).toBe(day2 + 90_000 - day0);
    expect(receipt.elapsedSpanMs).toBe(2 * DAY_MS + 90_000);
  });

  it("ignores sessions that have only empty batches", () => {
    const batches = [
      batch({
        sessionId: "empty",
        sessionStartedAt: 0,
        serverReceivedAt: 1_000,
        events: [],
      }),
      batch({
        sessionId: "real",
        sessionStartedAt: 10_000,
        serverReceivedAt: 11_000,
        events: [{ t: 0, type: "insert", pos: 0, len: 1, text: "x" }],
      }),
    ];
    const receipt = computeReceipt(batches, "x");
    expect(receipt.sessionCount).toBe(1);
    expect(receipt.elapsedSpanMs).toBe(1_000);
  });
});

describe("origin shares", () => {
  it("drops pasted share when pasted text is later deleted", () => {
    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 5, text: "hello" },
      { t: 100, type: "paste", pos: 5, len: 6, text: " world" },
      { t: 200, type: "delete", pos: 5, len: 6, text: " world" },
    ];
    const rebuilt = applyEvents(events);
    expect(rebuilt.text).toBe("hello");
    expect(rebuilt.origins.every((o) => o === "typed")).toBe(true);

    const receipt = computeReceipt(
      [batch({ sessionId: "s1", events, serverReceivedAt: 200 })],
      rebuilt.text,
    );
    expect(receipt.typedShare).toBe(1);
    expect(receipt.pastedShare).toBe(0);
    expect(receipt.quotedShare).toBe(0);
  });

  it("counts paste inside a quote line as quoted, not pasted", () => {
    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 2, text: "> " },
      { t: 50, type: "paste", pos: 2, len: 5, text: "cited" },
      { t: 100, type: "insert", pos: 7, len: 6, text: "\nmine." },
    ];
    const rebuilt = applyEvents(events);
    expect(rebuilt.text).toBe("> cited\nmine.");
    expect(rebuilt.origins.slice(2, 7).every((o) => o === "quoted")).toBe(true);

    const shares = originShares(rebuilt.origins, rebuilt.text);
    expect(shares.quotedShare).toBeCloseTo(5 / rebuilt.text.length);
    expect(shares.pastedShare).toBe(0);
    expect(shares.typedShare).toBeCloseTo(8 / rebuilt.text.length);

    const receipt = computeReceipt(
      [batch({ sessionId: "s1", events, serverReceivedAt: 100 })],
      rebuilt.text,
    );
    expect(receipt.quotedShare).toBe(shares.quotedShare);
    expect(receipt.pastedShare).toBe(0);
  });
});

describe("revisionRatio", () => {
  it("divides total typed insert chars by final length", () => {
    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 4, text: "abcd" },
      { t: 50, type: "delete", pos: 2, len: 2, text: "cd" },
      { t: 100, type: "insert", pos: 2, len: 2, text: "ef" },
      { t: 150, type: "paste", pos: 4, len: 3, text: "!!!" },
    ];
    // typed inserts: 4 + 2 = 6; final "abef!!!" length 7
    expect(typedInsertChars(events)).toBe(6);
    const finalText = applyEvents(events).text;
    expect(finalText).toBe("abef!!!");
    const receipt = computeReceipt(
      [batch({ sessionId: "s1", events, serverReceivedAt: 150 })],
      finalText,
    );
    expect(receipt.revisionRatio).toBeCloseTo(6 / 7);
  });
});

describe("wordCount", () => {
  it("splits on whitespace and ignores empty strings", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("  one   two\tthree\n")).toBe(3);
    expect(wordCount("single")).toBe(1);
  });
});

describe("timing flags: fast stretches", () => {
  it("counts a merged stretch when a 60s window exceeds 150 wpm", () => {
    // Need more than 750 typed chars in some rolling 60s window.
    const charsNeeded = FAST_STRETCH_WPM * CHARS_PER_WORD + 1; // 751
    expect(charsNeeded).toBe(751);

    // Burst: 751 single-char inserts evenly across 60s (just over 150 wpm).
    const events = typedChars(
      "x".repeat(charsNeeded),
      0,
      FAST_STRETCH_WINDOW_MS / charsNeeded,
    );
    expect(fastStretchCountForEvents(events)).toBeGreaterThanOrEqual(1);

    // Slow typing at ~30 wpm never triggers.
    const slow = typedChars("hello world and more text here", 0, 200);
    expect(fastStretchCountForEvents(slow)).toBe(0);
  });
});

describe("timing flags: uniform typing", () => {
  it("flags a scripted bot-like run of perfectly even keystrokes", () => {
    const interval = 80;
    const events = typedChars("a".repeat(UNIFORM_RUN_MIN_LENGTH), 0, interval);
    expect(uniformTypingRunCount(events)).toBe(1);

    // Human-like jitter: same length, high CV.
    const jittered: EditEvent[] = [];
    let t = 0;
    for (let i = 0; i < UNIFORM_RUN_MIN_LENGTH; i += 1) {
      jittered.push({
        t,
        type: "insert",
        pos: i,
        len: 1,
        text: "a",
      });
      // Alternate 40ms and 200ms → high CV
      t += i % 2 === 0 ? 40 : 200;
    }
    expect(uniformTypingRunCount(jittered)).toBe(0);
  });
});

describe("delayedBatchCount", () => {
  it("counts batches flagged delayed", () => {
    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 1, text: "a" },
    ];
    const receipt = computeReceipt(
      [
        batch({
          sessionId: "s1",
          events,
          delayed: true,
          serverReceivedAt: 1,
        }),
        batch({
          sessionId: "s1",
          events: [{ t: 10, type: "insert", pos: 1, len: 1, text: "b" }],
          delayed: true,
          serverReceivedAt: 2,
        }),
        batch({
          sessionId: "s1",
          events: [{ t: 20, type: "insert", pos: 2, len: 1, text: "c" }],
          delayed: false,
          serverReceivedAt: 3,
        }),
      ],
      "abc",
    );
    expect(receipt.delayedBatchCount).toBe(2);
  });
});

describe("originShares with links", () => {
  it("excludes link characters so a typed piece with a pasted URL stays handwritten", () => {
    const url = `https://example.com/${"x".repeat(70)}`;
    expect(url.length).toBe(90);
    const typed = "I wrote every word here by hand. ";
    const events: EditEvent[] = [
      ...typedChars(typed, 0, 80),
      {
        t: typed.length * 80,
        type: "paste",
        pos: typed.length,
        len: url.length,
        text: url,
      },
    ];
    const rebuilt = applyEvents(events);
    expect(rebuilt.text).toBe(typed + url);
    const shares = originShares(rebuilt.origins, rebuilt.text);
    expect(shares.typedShare).toBe(1);
    expect(shares.pastedShare).toBe(0);
    const receipt = computeReceipt(
      [batch({ sessionId: "s1", events, serverReceivedAt: 10_000 })],
      rebuilt.text,
    );
    expect(receipt.typedShare).toBe(1);
    expect(receipt.typedShare).toBeGreaterThanOrEqual(0.95);
  });

  it("excludes shortened link labels so a typed piece still reads handwritten", () => {
    const url = "https://www.theatlantic.com/ideas/x";
    const label = "theatlantic.com";
    const typed = "I read this. ";
    const events: EditEvent[] = [
      ...typedChars(typed, 0, 50),
      {
        t: 1000,
        type: "insert",
        pos: typed.length,
        len: url.length,
        text: url,
      },
      {
        t: 1100,
        type: "insert",
        pos: typed.length + url.length,
        len: 1,
        text: " ",
      },
      {
        t: 1200,
        type: "link",
        pos: typed.length,
        len: url.length,
        text: label,
        url,
      },
    ];
    const rebuilt = applyEvents(events);
    expect(rebuilt.text).toBe(`${typed}${label} `);
    const shares = originShares(rebuilt.origins, rebuilt.text);
    expect(shares.typedShare).toBe(1);
    const receipt = computeReceipt(
      [batch({ sessionId: "s1", events, serverReceivedAt: 10_000 })],
      rebuilt.text,
    );
    expect(receipt.typedShare).toBeGreaterThanOrEqual(0.95);
  });
});

describe("computeReceipt", () => {
  it("returns version 2 with all metrics", () => {
    const events = typedChars("hi there", 0, 100);
    const finalText = applyEvents(events).text;
    const receipt = computeReceipt(
      [
        batch({
          sessionId: "s1",
          sessionStartedAt: 1_000,
          serverReceivedAt: 1_000 + 800,
          events,
        }),
      ],
      finalText,
    );
    expect(receipt.version).toBe(2);
    expect(receipt.wordCount).toBe(2);
    expect(receipt.sessionCount).toBe(1);
    expect(receipt.typedShare).toBe(1);
    expect(receipt.activeWritingTimeMs).toBe(700);
    expect(receipt.elapsedSpanMs).toBe(800);
    expect(receipt.sessionRows).toEqual([
      {
        startedAt: 1_000,
        activeWritingTimeMs: 700,
        wordsAdded: 2,
      },
    ]);
    expect(receipt.sittingRows).toEqual([
      {
        startedAt: 1_000,
        activeWritingTimeMs: 700,
        wordsAdded: 2,
      },
    ]);
  });
});

describe("liveBatchesFromEvents", () => {
  it("splits on session-clock resets for the debug panel", () => {
    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 1, text: "a" },
      { t: 50, type: "insert", pos: 1, len: 1, text: "b" },
      { t: 0, type: "insert", pos: 2, len: 1, text: "c" },
      { t: 40, type: "insert", pos: 3, len: 1, text: "d" },
    ];
    const batches = liveBatchesFromEvents(events, {
      sessionStartedAt: 10_000,
      now: 10_100,
      delayedBatchCount: 1,
    });
    expect(batches).toHaveLength(2);
    expect(batches[0].delayed).toBe(true);
    expect(batches[1].delayed).toBe(false);
    expect(batches[1].sessionStartedAt).toBe(10_000);
    const receipt = computeReceipt(batches, "abcd");
    expect(receipt.sessionCount).toBe(2);
    expect(receipt.activeWritingTimeMs).toBe(90);
  });
});
