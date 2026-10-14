import { describe, expect, it } from "vitest";
import {
  formatDuration,
  formatReceiptDate,
  formatReceiptNotes,
  pieceCardNumber,
  sharesToPercents,
  shortenHash,
} from "./format";

describe("formatDuration", () => {
  it('returns "<1 min" under one minute', () => {
    expect(formatDuration(0)).toBe("<1 min");
    expect(formatDuration(59_999)).toBe("<1 min");
  });

  it('returns "N min" under one hour', () => {
    expect(formatDuration(60_000)).toBe("1 min");
    expect(formatDuration(52 * 60_000)).toBe("52 min");
    expect(formatDuration(59 * 60_000 + 59_999)).toBe("59 min");
  });

  it('returns hours and minutes without decimals', () => {
    expect(formatDuration(60 * 60_000)).toBe("1 hr");
    expect(formatDuration((60 + 12) * 60_000)).toBe("1 hr 12 min");
    expect(formatDuration((2 * 60 + 5) * 60_000 + 999)).toBe("2 hr 5 min");
  });
});

describe("sharesToPercents", () => {
  it("returns zeros when all shares are zero", () => {
    expect(sharesToPercents(0, 0, 0)).toEqual({
      typed: 0,
      pasted: 0,
      quoted: 0,
    });
  });

  it("always sums to 100", () => {
    const cases: Array<[number, number, number]> = [
      [1, 0, 0],
      [0.94, 0.04, 0.02],
      [1 / 3, 1 / 3, 1 / 3],
      [0.5, 0.5, 0],
      [0.333, 0.333, 0.334],
    ];
    for (const [t, p, q] of cases) {
      const result = sharesToPercents(t, p, q);
      expect(result.typed + result.pasted + result.quoted).toBe(100);
    }
  });

  it("uses largest-remainder rounding", () => {
    expect(sharesToPercents(1 / 3, 1 / 3, 1 / 3)).toEqual({
      typed: 34,
      pasted: 33,
      quoted: 33,
    });
    expect(sharesToPercents(0.94, 0.04, 0.02)).toEqual({
      typed: 94,
      pasted: 4,
      quoted: 2,
    });
  });
});

describe("formatReceiptDate", () => {
  it("formats in en-US as Month D, YYYY", () => {
    expect(formatReceiptDate(new Date("2026-10-13T12:00:00Z"), "en-US")).toBe(
      "Oct 13, 2026",
    );
  });
});

describe("shortenHash", () => {
  it('shortens to "xxxx·yyyy"', () => {
    expect(shortenHash("7f3a9b2cc91eabcd")).toBe("7f3a·abcd");
  });
});

describe("formatReceiptNotes", () => {
  it("returns null when there are no flags", () => {
    expect(
      formatReceiptNotes({
        fastStretchCount: 0,
        uniformTypingRunCount: 0,
        delayedBatchCount: 0,
      }),
    ).toBeNull();
  });

  it("joins timing and delayed notes as one line", () => {
    expect(
      formatReceiptNotes({
        fastStretchCount: 2,
        uniformTypingRunCount: 0,
        delayedBatchCount: 1,
      }),
    ).toBe("2 unusually fast stretches. 1 offline stretch.");
  });
});

describe("pieceCardNumber", () => {
  it("returns a stable number in 1–9999", () => {
    const id = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    const n = pieceCardNumber(id);
    expect(n).toBeGreaterThanOrEqual(1);
    expect(n).toBeLessThanOrEqual(9999);
    expect(pieceCardNumber(id)).toBe(n);
  });
});
