import { describe, expect, it } from "vitest";
import {
  sanitizeProps,
  signatureTier,
  wordBucket,
} from "./names";

describe("sanitizeProps", () => {
  it("allows empty props for events with none", () => {
    expect(sanitizeProps("guest_started", undefined)).toEqual({});
    expect(sanitizeProps("guest_started", {})).toEqual({});
  });

  it("rejects unknown keys and invalid enums", () => {
    expect(sanitizeProps("signin_opened", { reason: "nope" })).toBeNull();
    expect(
      sanitizeProps("signin_opened", { reason: "empty", title: "x" }),
    ).toBeNull();
  });

  it("caps strings at 32 characters", () => {
    expect(
      sanitizeProps("published", {
        visibility: "public",
        tier: "hand",
        words: "x".repeat(33),
      }),
    ).toBeNull();
  });
});

describe("signatureTier and wordBucket", () => {
  it("maps typed share to tiers", () => {
    expect(signatureTier(1)).toBe("hand");
    expect(signatureTier(0.8)).toBe("most");
    expect(signatureTier(0.5)).toBe("gathered");
    expect(signatureTier(0.1)).toBe("shaped");
  });

  it("buckets word counts", () => {
    expect(wordBucket(40)).toBe("under 100");
    expect(wordBucket(100)).toBe("100–300");
    expect(wordBucket(300)).toBe("100–300");
    expect(wordBucket(301)).toBe("300–1000");
    expect(wordBucket(1001)).toBe("over 1000");
  });
});
