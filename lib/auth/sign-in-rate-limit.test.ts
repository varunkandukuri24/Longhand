import { describe, expect, it } from "vitest";
import {
  clientIpFromProxyHeaders,
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

describe("client IP from headers", () => {
  it("prefers x-real-ip on Vercel", () => {
    const headers = new Map([
      ["x-real-ip", "198.51.100.10"],
      ["x-forwarded-for", "203.0.113.1, 10.0.0.1"],
    ]);
    expect(
      clientIpFromProxyHeaders((name) => headers.get(name) ?? null, true),
    ).toBe("198.51.100.10");
  });

  it("uses the first x-forwarded-for entry on Vercel when x-real-ip is missing", () => {
    const headers = new Map([["x-forwarded-for", "203.0.113.1, 10.0.0.1"]]);
    expect(
      clientIpFromProxyHeaders((name) => headers.get(name) ?? null, true),
    ).toBe("203.0.113.1");
  });

  it("prefers x-forwarded-for off Vercel", () => {
    const headers = new Map([
      ["x-real-ip", "198.51.100.10"],
      ["x-forwarded-for", "203.0.113.1, 10.0.0.1"],
    ]);
    expect(
      clientIpFromProxyHeaders((name) => headers.get(name) ?? null, false),
    ).toBe("203.0.113.1");
  });
});

