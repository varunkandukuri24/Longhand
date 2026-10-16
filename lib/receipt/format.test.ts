import { describe, expect, it } from "vitest";
import {
  formatCompositionLegend,
  formatDuration,
  formatReceiptDate,
  formatReceiptNotes,
  formatRevisionLine,
  formatSignatureMeta,
  formatSignatureSentence,
  formatSittingDateRange,
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

  it("returns hours and minutes without decimals", () => {
    expect(formatDuration(60 * 60_000)).toBe("1 hr");
    expect(formatDuration((60 + 12) * 60_000)).toBe("1 hr 12 min");
    expect(formatDuration((2 * 60 + 5) * 60_000 + 999)).toBe("2 hr 5 min");
  });
});

describe("formatSignatureSentence", () => {
  it("picks the tier by typed share", () => {
    expect(formatSignatureSentence("Ada", 1)).toBe("Ada wrote this by hand.");
    expect(formatSignatureSentence("Ada", 0.8)).toBe(
      "Ada wrote most of this by hand.",
    );
    expect(formatSignatureSentence("Ada", 0.5)).toBe(
      "Ada wrote and gathered this.",
    );
    expect(formatSignatureSentence("Ada", 0.2)).toBe(
      "Ada gathered and shaped this.",
    );
  });

  it("adds the response suffix instead of a full stop", () => {
    expect(formatSignatureSentence("Ada", 1, "theathletic.com")).toBe(
      "Ada wrote this by hand, in response to theathletic.com.",
    );
    expect(formatSignatureSentence("Ada", 0.5, "nytimes.com")).toBe(
      "Ada wrote and gathered this, in response to nytimes.com.",
    );
  });
});

describe("formatSignatureMeta", () => {
  it("formats duration, sittings and date range", () => {
    const starts = [
      Date.UTC(2026, 9, 11, 14, 0, 0),
      Date.UTC(2026, 9, 13, 10, 0, 0),
    ];
    expect(
      formatSignatureMeta(52 * 60_000, starts, {
        now: new Date("2026-10-15T12:00:00Z"),
        locale: "en-US",
      }),
    ).toBe("52 min over 2 sittings · Oct 11–13");
  });

  it('uses "1 sitting" for a single sitting', () => {
    const start = Date.UTC(2026, 9, 11, 14, 0, 0);
    expect(
      formatSignatureMeta(20 * 60_000, [start], {
        now: new Date("2026-10-15T12:00:00Z"),
        locale: "en-US",
      }),
    ).toBe("20 min over 1 sitting · Oct 11");
  });
});

describe("formatSittingDateRange", () => {
  it("adds the year when it is not the current year", () => {
    expect(
      formatSittingDateRange([new Date(2024, 0, 5).getTime()], {
        now: new Date(2026, 9, 15),
        locale: "en-US",
      }),
    ).toBe("Jan 5, 2024");
  });
});

describe("formatCompositionLegend", () => {
  it("hides zero parts and sums to 100", () => {
    const legend = formatCompositionLegend(0.94, 0.04, 0.02, "example.com");
    expect(legend.map((p) => p.percent).reduce((a, b) => a + b, 0)).toBe(100);
    expect(legend.map((p) => p.label)).toEqual([
      "94% typed here",
      "4% brought in",
      "2% quoted from example.com",
    ]);
  });

  it("omits zero shares", () => {
    const legend = formatCompositionLegend(1, 0, 0);
    expect(legend).toEqual([
      { kind: "typed", percent: 100, label: "100% typed here" },
    ]);
  });

  it("never says pasted", () => {
    const legend = formatCompositionLegend(0.5, 0.5, 0);
    expect(legend.some((p) => /pasted/i.test(p.label))).toBe(false);
    expect(legend.some((p) => /brought in/i.test(p.label))).toBe(true);
  });
});

describe("sharesToPercents", () => {
  it("returns zeros when all shares are zero", () => {
    expect(sharesToPercents(0, 0, 0)).toEqual({
      typed: 0,
      broughtIn: 0,
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
      expect(result.typed + result.broughtIn + result.quoted).toBe(100);
    }
  });

  it("uses largest-remainder rounding", () => {
    expect(sharesToPercents(1 / 3, 1 / 3, 1 / 3)).toEqual({
      typed: 34,
      broughtIn: 33,
      quoted: 33,
    });
    expect(sharesToPercents(0.94, 0.04, 0.02)).toEqual({
      typed: 94,
      broughtIn: 4,
      quoted: 2,
    });
  });
});

describe("formatRevisionLine", () => {
  it("formats the revision ratio in plain words", () => {
    expect(formatRevisionLine(1.6)).toBe(
      "1.6 words written for every word kept.",
    );
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

  it("uses DESIGN.md wording for timing and offline notes", () => {
    expect(
      formatReceiptNotes({
        fastStretchCount: 2,
        uniformTypingRunCount: 0,
        delayedBatchCount: 1,
      }),
    ).toEqual([
      "2 stretches of unusually fast typing",
      "1 stretch written offline and synced later",
    ]);
  });
});
