import { describe, expect, it } from "vitest";
import {
  isOverSignInLimit,
  normalizeSignInEmail,
  SIGN_IN_EMAIL_LIMIT,
  SIGN_IN_IP_LIMIT,
} from "./sign-in-rate-limit";

describe("sign-in rate limit", () => {
  it("normalizes email", () => {
    expect(normalizeSignInEmail("  Ada@Example.COM ")).toBe("ada@example.com");
  });

  it("allows under both limits", () => {
    expect(isOverSignInLimit(0, 0)).toBe(false);
    expect(isOverSignInLimit(SIGN_IN_EMAIL_LIMIT - 1, SIGN_IN_IP_LIMIT - 1)).toBe(
      false,
    );
  });

  it("blocks at 5 emails per address", () => {
    expect(isOverSignInLimit(SIGN_IN_EMAIL_LIMIT, 0)).toBe(true);
  });

  it("blocks at 20 emails per IP", () => {
    expect(isOverSignInLimit(0, SIGN_IN_IP_LIMIT)).toBe(true);
  });
});
