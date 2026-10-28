import { afterEach, describe, expect, it } from "vitest";
import { GUEST_COOKIE, guestCookieOptions } from "./cookie";

describe("guest cookie", () => {
  const prevRoot = process.env.ROOT_DOMAIN;
  const prevEnv = process.env.VERCEL_ENV;
  const prevBranch = process.env.VERCEL_BRANCH_URL;

  afterEach(() => {
    if (prevRoot === undefined) {
      delete process.env.ROOT_DOMAIN;
    } else {
      process.env.ROOT_DOMAIN = prevRoot;
    }
    if (prevEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = prevEnv;
    }
    if (prevBranch === undefined) {
      delete process.env.VERCEL_BRANCH_URL;
    } else {
      process.env.VERCEL_BRANCH_URL = prevBranch;
    }
  });

  it("is host-only with no Domain attribute", () => {
    process.env.ROOT_DOMAIN = "localhost:3000";
    delete process.env.VERCEL_ENV;
    const options = guestCookieOptions();
    expect(GUEST_COOKIE).toBe("lh_guest");
    expect(options).not.toHaveProperty("domain");
    expect(Object.prototype.hasOwnProperty.call(options, "domain")).toBe(false);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
    expect(options.secure).toBe(false);
  });

  it("is Secure on HTTPS previews without AUTH_URL", () => {
    delete process.env.ROOT_DOMAIN;
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_BRANCH_URL = "longhand-git-test.vercel.app";
    expect(guestCookieOptions().secure).toBe(true);
  });
});

