import { afterEach, describe, expect, it, vi } from "vitest";

describe("rootDomain", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("throws in a browser-like environment", async () => {
    vi.stubGlobal("window", {});
    const { rootDomain } = await import("./hosts");
    expect(() => rootDomain()).toThrow(/must only run on the server/);
  });

  it("returns ROOT_DOMAIN on the server", async () => {
    vi.stubGlobal("window", undefined);
    process.env.ROOT_DOMAIN = "example.test";
    const { rootDomain } = await import("./hosts");
    expect(rootDomain()).toBe("example.test");
  });
});
