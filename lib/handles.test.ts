import { describe, expect, it } from "vitest";
import {
  normalizeHandle,
  RESERVED_HANDLES,
  suggestHandle,
  validateHandle,
} from "./handles";

describe("normalizeHandle", () => {
  it("lowercases and collapses non-alphanumeric runs to hyphens", () => {
    expect(normalizeHandle("Hello World")).toBe("hello-world");
    expect(normalizeHandle("  Foo__Bar!! ")).toBe("foo-bar");
    expect(normalizeHandle("a--b")).toBe("a-b");
  });

  it("trims leading and trailing hyphens and caps at 30", () => {
    expect(normalizeHandle("-hello-")).toBe("hello");
    expect(normalizeHandle("a".repeat(40))).toBe("a".repeat(30));
  });
});

describe("validateHandle", () => {
  it("accepts 3–30 char handles with single hyphens", () => {
    expect(validateHandle("abc")).toEqual({ ok: true, handle: "abc" });
    expect(validateHandle("anon24")).toEqual({ ok: true, handle: "anon24" });
    expect(validateHandle("hello-world")).toEqual({
      ok: true,
      handle: "hello-world",
    });
  });

  it("rejects length, format, and reserved names", () => {
    expect(validateHandle("ab").ok).toBe(false);
    expect(validateHandle("a".repeat(31)).ok).toBe(false);
    expect(validateHandle("-abc").ok).toBe(false);
    expect(validateHandle("abc-").ok).toBe(false);
    expect(validateHandle("ab--cd").ok).toBe(false);
    expect(validateHandle("Hello").ok).toBe(true); // lowercased
    expect(validateHandle("www").ok).toBe(false);
    expect(validateHandle("admin").ok).toBe(false);
    expect(validateHandle("longhand").ok).toBe(false);
  });

  it("lists every reserved label", () => {
    for (const name of [
      "www",
      "app",
      "api",
      "admin",
      "mail",
      "help",
      "about",
      "blog",
      "static",
      "assets",
      "cdn",
      "status",
      "support",
      "longhand",
      "auth",
      "signin",
      "login",
      "signup",
      "dashboard",
      "settings",
      "write",
      "p",
      "u",
      "docs",
      "dev",
      "staging",
      "root",
    ]) {
      expect(RESERVED_HANDLES.has(name)).toBe(true);
      expect(validateHandle(name).ok).toBe(false);
    }
  });
});

describe("suggestHandle", () => {
  it("suggests from the display name", () => {
    expect(suggestHandle("Anon 24")).toBe("anon-24");
    expect(suggestHandle("Hello World")).toBe("hello-world");
  });

  it("falls back when the name is too short or reserved", () => {
    expect(suggestHandle("")).toBe("writer");
    expect(suggestHandle("ab")).toBe("writer");
    expect(suggestHandle("Admin")).toBe("admin-2");
  });
});
