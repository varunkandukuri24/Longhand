import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "ROOT_DOMAIN",
  "VERCEL_ENV",
  "VERCEL_BRANCH_URL",
  "VERCEL_URL",
] as const;

const saved = new Map<string, string | undefined>();

function stashEnv() {
  saved.clear();
  for (const key of ENV_KEYS) {
    saved.set(key, process.env[key]);
  }
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = saved.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("hosts", () => {
  beforeEach(() => {
    stashEnv();
  });

  afterEach(() => {
    restoreEnv();
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
    delete process.env.VERCEL_ENV;
    const { rootDomain } = await import("./hosts");
    expect(rootDomain()).toBe("example.test");
  });

  it("prefers ROOT_DOMAIN over preview URLs", async () => {
    vi.stubGlobal("window", undefined);
    process.env.ROOT_DOMAIN = "typelonghand.com";
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_BRANCH_URL = "longhand-git-test.vercel.app";
    const { rootDomain } = await import("./hosts");
    expect(rootDomain()).toBe("typelonghand.com");
  });

  it("uses VERCEL_BRANCH_URL on a preview when ROOT_DOMAIN is unset", async () => {
    vi.stubGlobal("window", undefined);
    delete process.env.ROOT_DOMAIN;
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_BRANCH_URL = "longhand-git-test.vercel.app";
    process.env.VERCEL_URL = "longhand-abc123.vercel.app";
    const { rootDomain, isPreview } = await import("./hosts");
    expect(isPreview()).toBe(true);
    expect(rootDomain()).toBe("longhand-git-test.vercel.app");
  });

  it("falls back to VERCEL_URL when the branch URL is unset", async () => {
    vi.stubGlobal("window", undefined);
    delete process.env.ROOT_DOMAIN;
    process.env.VERCEL_ENV = "preview";
    delete process.env.VERCEL_BRANCH_URL;
    process.env.VERCEL_URL = "longhand-abc123.vercel.app";
    const { rootDomain } = await import("./hosts");
    expect(rootDomain()).toBe("longhand-abc123.vercel.app");
  });

  it("throws when ROOT_DOMAIN is unset outside a preview", async () => {
    vi.stubGlobal("window", undefined);
    delete process.env.ROOT_DOMAIN;
    delete process.env.VERCEL_ENV;
    const { rootDomain } = await import("./hosts");
    expect(() => rootDomain()).toThrow(/ROOT_DOMAIN is not set/);
  });

  it("uses https for vercel.app hosts", async () => {
    vi.stubGlobal("window", undefined);
    delete process.env.ROOT_DOMAIN;
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_BRANCH_URL = "longhand-git-test.vercel.app";
    const { siteProtocol, secureCookies, mainOrigin } = await import(
      "./hosts"
    );
    expect(siteProtocol()).toBe("https");
    expect(secureCookies()).toBe(true);
    expect(mainOrigin()).toBe("https://longhand-git-test.vercel.app");
  });

  it("keeps writer pages on subdomains in production", async () => {
    vi.stubGlobal("window", undefined);
    process.env.ROOT_DOMAIN = "typelonghand.com";
    process.env.VERCEL_ENV = "production";
    const { writerOrigin } = await import("./hosts");
    expect(writerOrigin("ada")).toBe("https://ada.typelonghand.com");
  });

  it("serves writer pages at /u/{handle} on a preview", async () => {
    vi.stubGlobal("window", undefined);
    delete process.env.ROOT_DOMAIN;
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_BRANCH_URL = "longhand-git-test.vercel.app";
    const { writerOrigin } = await import("./hosts");
    expect(writerOrigin("ada")).toBe(
      "https://longhand-git-test.vercel.app/u/ada",
    );
  });
});
