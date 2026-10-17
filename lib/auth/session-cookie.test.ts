import { describe, expect, it } from "vitest";
import { sessionCookieOptions } from "./session-cookie";

describe("session cookie", () => {
  it("has no Domain attribute", () => {
    const insecure = sessionCookieOptions(false);
    const secure = sessionCookieOptions(true);
    expect(insecure.options).not.toHaveProperty("domain");
    expect(secure.options).not.toHaveProperty("domain");
    expect(
      Object.prototype.hasOwnProperty.call(insecure.options, "domain"),
    ).toBe(false);
  });
});
