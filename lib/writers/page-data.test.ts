import { describe, expect, it } from "vitest";
import {
  formatWriterPieceDuration,
  formatWriterSummary,
  writerExcerpt,
} from "./page-data";

describe("writer page helpers", () => {
  it("formats the summary line", () => {
    expect(
      formatWriterSummary({
        pieceCount: 1,
        totalWritingTimeMs: 52 * 60_000,
        since: new Date("2024-03-01T12:00:00Z"),
      }),
    ).toMatch(/^1 piece · 52 min of writing · since /);
    expect(
      formatWriterSummary({
        pieceCount: 3,
        totalWritingTimeMs: 3_600_000,
        since: new Date("2024-03-01T12:00:00Z"),
      }),
    ).toMatch(/^3 pieces · 1 hr of writing · since /);
  });

  it("formats piece duration with sitting wording", () => {
    expect(formatWriterPieceDuration(52 * 60_000, 1)).toEqual({
      durationLabel: "52 min",
      sittingLabel: "in 1 sitting",
    });
    expect(formatWriterPieceDuration(52 * 60_000, 3)).toEqual({
      durationLabel: "52 min",
      sittingLabel: "over 3 sittings",
    });
  });

  it("builds an excerpt with hostnames and without quote marks", () => {
    const text = 'See https://www.theatlantic.com/foo "quoted"\nSecond line\nThird';
    expect(writerExcerpt(text, null)).toBe(
      "See theatlantic.com quoted\nSecond line",
    );
  });
});
