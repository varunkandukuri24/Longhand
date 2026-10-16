import { describe, expect, it } from "vitest";
import { computeSittings } from "./compute-receipt";
import { groupSessionsIntoSittings, SITTING_GAP_MS } from "./sittings";
import type { EditEvent, ReceiptBatchInput } from "./types";

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

describe("groupSessionsIntoSittings", () => {
  it("merges 7 sessions each 1 minute apart into 1 sitting", () => {
    const base = Date.UTC(2026, 9, 11, 10, 0, 0);
    const sessions = Array.from({ length: 7 }, (_, i) => {
      const startedAt = base + i * 60_000;
      return {
        startedAt,
        lastEventAt: startedAt + 30_000,
        activeWritingTimeMs: 20_000,
        wordsAdded: 10,
      };
    });
    const sittings = groupSessionsIntoSittings(sessions);
    expect(sittings).toHaveLength(1);
    expect(sittings[0].startedAt).toBe(base);
    expect(sittings[0].wordsAdded).toBe(70);
    expect(sittings[0].activeWritingTimeMs).toBe(140_000);
  });

  it("keeps two sessions 45 minutes apart as 2 sittings", () => {
    const firstStart = Date.UTC(2026, 9, 11, 10, 0, 0);
    const secondStart = firstStart + 45 * 60_000;
    const sittings = groupSessionsIntoSittings([
      {
        startedAt: firstStart,
        lastEventAt: firstStart + 5 * 60_000,
        activeWritingTimeMs: 4 * 60_000,
        wordsAdded: 50,
      },
      {
        startedAt: secondStart,
        lastEventAt: secondStart + 5 * 60_000,
        activeWritingTimeMs: 4 * 60_000,
        wordsAdded: 40,
      },
    ]);
    expect(sittings).toHaveLength(2);
    expect(sittings[0].startedAt).toBe(firstStart);
    expect(sittings[1].startedAt).toBe(secondStart);
  });

  it("merges when the next session starts under 30 minutes after the last event", () => {
    const base = Date.UTC(2026, 9, 11, 10, 0, 0);
    const sittings = groupSessionsIntoSittings([
      {
        startedAt: base,
        lastEventAt: base + 10 * 60_000,
        activeWritingTimeMs: 8 * 60_000,
        wordsAdded: 100,
      },
      {
        startedAt: base + 10 * 60_000 + (SITTING_GAP_MS - 1),
        lastEventAt: base + 20 * 60_000 + (SITTING_GAP_MS - 1),
        activeWritingTimeMs: 4 * 60_000,
        wordsAdded: 40,
      },
    ]);
    expect(sittings).toHaveLength(1);
  });

  it("does not merge when the gap is exactly 30 minutes", () => {
    const base = Date.UTC(2026, 9, 11, 10, 0, 0);
    const sittings = groupSessionsIntoSittings([
      {
        startedAt: base,
        lastEventAt: base + 5 * 60_000,
        activeWritingTimeMs: 4 * 60_000,
        wordsAdded: 50,
      },
      {
        startedAt: base + 5 * 60_000 + SITTING_GAP_MS,
        lastEventAt: base + 10 * 60_000 + SITTING_GAP_MS,
        activeWritingTimeMs: 4 * 60_000,
        wordsAdded: 40,
      },
    ]);
    expect(sittings).toHaveLength(2);
  });
});

describe("computeSittings", () => {
  it("ignores a session with no events", () => {
    const start = Date.UTC(2026, 9, 11, 9, 0, 0);
    const batches = [
      batch({
        sessionId: "empty",
        sessionStartedAt: start,
        serverReceivedAt: start,
        events: [],
      }),
      batch({
        sessionId: "s1",
        sessionStartedAt: start + 60_000,
        serverReceivedAt: start + 2 * 60_000,
        events: [
          { t: 0, type: "insert", pos: 0, len: 1, text: "a" },
          { t: 30_000, type: "insert", pos: 1, len: 1, text: "b" },
        ],
      }),
      batch({
        sessionId: "s2",
        sessionStartedAt: start + 2 * 60_000,
        serverReceivedAt: start + 3 * 60_000,
        events: [
          { t: 0, type: "insert", pos: 2, len: 1, text: "c" },
          { t: 20_000, type: "insert", pos: 3, len: 1, text: "d" },
        ],
      }),
    ];
    expect(computeSittings(batches)).toHaveLength(1);
  });

  it("groups from batches using absolute session start and last event", () => {
    const start = Date.UTC(2026, 9, 11, 9, 0, 0);
    const batches = [
      batch({
        sessionId: "s1",
        sessionStartedAt: start,
        serverReceivedAt: start + 5 * 60_000,
        events: [
          { t: 0, type: "insert", pos: 0, len: 1, text: "a" },
          { t: 60_000, type: "insert", pos: 1, len: 1, text: "b" },
        ],
      }),
      batch({
        sessionId: "s2",
        sessionStartedAt: start + 3 * 60_000,
        serverReceivedAt: start + 8 * 60_000,
        events: [
          { t: 0, type: "insert", pos: 2, len: 1, text: "c" },
          { t: 60_000, type: "insert", pos: 3, len: 1, text: "d" },
        ],
      }),
      batch({
        sessionId: "s3",
        sessionStartedAt: start + 6 * 60_000,
        serverReceivedAt: start + 12 * 60_000,
        events: [
          { t: 0, type: "insert", pos: 4, len: 1, text: "e" },
          { t: 60_000, type: "insert", pos: 5, len: 1, text: "f" },
        ],
      }),
    ];
    expect(computeSittings(batches)).toHaveLength(1);
  });
});
