import { describe, expect, it } from "vitest";
import { GUEST_COOKIE, guestCookieOptions } from "./cookie";

describe("guest cookie", () => {
  it("is host-only with no Domain attribute", () => {
    const options = guestCookieOptions();
    expect(GUEST_COOKIE).toBe("lh_guest");
    expect(options).not.toHaveProperty("domain");
    expect(Object.prototype.hasOwnProperty.call(options, "domain")).toBe(false);
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });
});
