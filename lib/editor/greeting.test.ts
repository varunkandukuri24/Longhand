import { describe, expect, it } from "vitest";
import {
  firstNameFromDisplayName,
  greetingPeriod,
  greetingTitlePlaceholder,
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

describe("greetingTitlePlaceholder", () => {
  it("uses the first name and local period", () => {
    const morning = new Date(2026, 0, 1, 9, 0);
    expect(greetingTitlePlaceholder("Ada Lovelace", morning)).toBe(
      "Good morning, Ada.",
    );
  });
});

describe("firstNameFromDisplayName", () => {
  it("takes the first word", () => {
    expect(firstNameFromDisplayName("Ada Lovelace")).toBe("Ada");
  });
});
