import { describe, expect, it } from "vitest";
import { normalizeDisplayName } from "./normalize-display-name";

describe("normalizeDisplayName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeDisplayName("  Ada   Lovelace  ")).toBe("Ada Lovelace");
  });

  it("rejects empty names", () => {
    expect(normalizeDisplayName("")).toBeNull();
    expect(normalizeDisplayName("   ")).toBeNull();
  });

  it("rejects names over 80 characters", () => {
    expect(normalizeDisplayName("a".repeat(81))).toBeNull();
    expect(normalizeDisplayName("a".repeat(80))).toBe("a".repeat(80));
  });
});
