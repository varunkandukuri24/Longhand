import { describe, expect, it } from "vitest";
import {
  atGuestLimit,
  exceedsGuestLimit,
  GUEST_CHAR_LIMIT,
  GUEST_NUDGE_WORDS,
  GUEST_WORD_LIMIT,
} from "./limits";

describe("guest word and character limits", () => {
  it("shows the nudge at 50 words", () => {
    expect(GUEST_NUDGE_WORDS).toBe(50);
  });

  it("allows exactly 500 words and 4000 characters", () => {
    const words = Array.from({ length: GUEST_WORD_LIMIT }, () => "word").join(
      " ",
    );
    expect(exceedsGuestLimit(words)).toBe(false);
    expect(atGuestLimit(words)).toBe(true);
    expect(exceedsGuestLimit("a".repeat(GUEST_CHAR_LIMIT))).toBe(false);
    expect(atGuestLimit("a".repeat(GUEST_CHAR_LIMIT))).toBe(true);
  });

  it("rejects 501 words or 4001 characters", () => {
    const words = Array.from(
      { length: GUEST_WORD_LIMIT + 1 },
      () => "word",
    ).join(" ");
    expect(exceedsGuestLimit(words)).toBe(true);
    expect(exceedsGuestLimit("a".repeat(GUEST_CHAR_LIMIT + 1))).toBe(true);
  });
});
