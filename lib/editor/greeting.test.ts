import { describe, expect, it } from "vitest";
import {
  blankPlaceholder,
  firstNameFromDisplayName,
  greetingPeriod,
  GUEST_PLACEHOLDER,
  writerPlaceholder,
} from "./greeting";

describe("greetingPeriod", () => {
  it("picks morning, afternoon and evening at the boundary hours", () => {
    expect(greetingPeriod(4)).toBe("evening");
    expect(greetingPeriod(5)).toBe("morning");
    expect(greetingPeriod(11)).toBe("morning");
    expect(greetingPeriod(12)).toBe("afternoon");
    expect(greetingPeriod(16)).toBe("afternoon");
    expect(greetingPeriod(17)).toBe("evening");
  });
});

describe("writerPlaceholder", () => {
  it("picks the right time of day at the boundaries", () => {
    expect(writerPlaceholder("Ada Lovelace", new Date(2026, 0, 1, 4, 59))).toBe(
      "Good evening, Ada. What has been on your mind?",
    );
    expect(writerPlaceholder("Ada Lovelace", new Date(2026, 0, 1, 5, 0))).toBe(
      "Good morning, Ada. What has been on your mind?",
    );
    expect(writerPlaceholder("Ada Lovelace", new Date(2026, 0, 1, 11, 59))).toBe(
      "Good morning, Ada. What has been on your mind?",
    );
    expect(writerPlaceholder("Ada Lovelace", new Date(2026, 0, 1, 12, 0))).toBe(
      "Good afternoon, Ada. What has been on your mind?",
    );
    expect(writerPlaceholder("Ada Lovelace", new Date(2026, 0, 1, 16, 59))).toBe(
      "Good afternoon, Ada. What has been on your mind?",
    );
    expect(writerPlaceholder("Ada Lovelace", new Date(2026, 0, 1, 17, 0))).toBe(
      "Good evening, Ada. What has been on your mind?",
    );
  });
});

describe("blankPlaceholder", () => {
  it("uses Write something for a guest", () => {
    expect(blankPlaceholder("guest", "Ada")).toBe(GUEST_PLACEHOLDER);
  });

  it("uses the writer greeting for a signed-in writer", () => {
    const morning = new Date(2026, 0, 1, 9, 0);
    expect(blankPlaceholder("writer", "Ada Lovelace", morning)).toBe(
      "Good morning, Ada. What has been on your mind?",
    );
  });
});

describe("firstNameFromDisplayName", () => {
  it("takes the first word", () => {
    expect(firstNameFromDisplayName("Ada Lovelace")).toBe("Ada");
  });
});
