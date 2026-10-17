import { describe, expect, it } from "vitest";
import { activeWritingTimeMs, computeReceipt } from "./compute-receipt";
import type { EditEvent, ReceiptBatchInput } from "./types";
import {
  formatWritingClock,
  liveSittingActiveMs,
  priorActiveWritingMs,
  priorActiveWritingMsFromBatches,
} from "./writing-time";

function insert(t: number, text: string, pos = 0): EditEvent {
  return { t, type: "insert", pos, len: text.length, text };
}

describe("priorActiveWritingMs", () => {
  it("matches computeReceipt active time for the same batches (to the second)", () => {
    const start = Date.UTC(2026, 0, 1, 12, 0, 0);
    const batches: ReceiptBatchInput[] = [
      {
        sessionId: "s1",
        sessionStartedAt: start,
        serverReceivedAt: start + 30_000,
        delayed: false,
        events: [insert(0, "a"), insert(5_000, "b"), insert(12_000, "c")],
      },
      {
        sessionId: "s2",
        sessionStartedAt: start + 3_600_000,
        serverReceivedAt: start + 3_630_000,
        delayed: false,
        events: [insert(0, "d"), insert(8_000, "e")],
      },
    ];

    const prior = priorActiveWritingMsFromBatches(batches);
    const receipt = computeReceipt(batches, "abcde");

    expect(Math.floor(prior / 1000)).toBe(
      Math.floor(receipt.activeWritingTimeMs / 1000),
    );
    expect(prior).toBe(activeWritingTimeMs(batches));
    expect(
      priorActiveWritingMs(batches.map((b) => b.events)),
    ).toBe(prior);
  });

  it("sums per session and ignores long gaps", () => {
    const sessions = [
      [insert(0, "a"), insert(10_000, "b"), insert(100_000, "c")],
      [insert(0, "d"), insert(4_000, "e")],
    ] as const;
    // session1: 10s only (100s gap dropped); session2: 4s
    expect(priorActiveWritingMs(sessions)).toBe(14_000);
  });
});

describe("liveSittingActiveMs", () => {
  it("adds a live trailing gap under 60s and pauses after", () => {
    const events = [insert(0, "a"), insert(5_000, "b")];
    const lastWall = 1_000_000;
    expect(
      liveSittingActiveMs({
        events,
        lastEventWallMs: lastWall,
        nowWallMs: lastWall + 20_000,
      }),
    ).toBe(5_000 + 20_000);
    expect(
      liveSittingActiveMs({
        events,
        lastEventWallMs: lastWall,
        nowWallMs: lastWall + 60_000,
      }),
    ).toBe(5_000);
  });
});

describe("formatWritingClock", () => {
  it("uses m:ss under an hour and h:mm:ss from an hour", () => {
    expect(formatWritingClock(0)).toBe("0:00");
    expect(formatWritingClock(12_000)).toBe("0:12");
    expect(formatWritingClock(65_000)).toBe("1:05");
    expect(formatWritingClock(3_600_000)).toBe("1:00:00");
    expect(formatWritingClock(3_661_000)).toBe("1:01:01");
  });
});
