import { describe, expect, it } from "vitest";
import { findLinks, labelForUrl, referencesFor } from "./references";

describe("findLinks", () => {
  it("finds http and https URLs", () => {
    const text = "See http://example.com and https://foo.bar/x";
    expect(findLinks(text)).toEqual([
      { url: "http://example.com", start: 4, end: 22 },
      { url: "https://foo.bar/x", start: 27, end: 44 },
    ]);
  });

  it("stops at whitespace", () => {
    expect(findLinks("https://a.com/path more")).toEqual([
      { url: "https://a.com/path", start: 0, end: 18 },
    ]);
  });

  it("trims trailing punctuation", () => {
    expect(findLinks('Read https://theatlantic.com/article).')).toEqual([
      { url: "https://theatlantic.com/article", start: 5, end: 36 },
    ]);
    expect(findLinks("https://x.com.")).toEqual([
      { url: "https://x.com", start: 0, end: 13 },
    ]);
    expect(findLinks('(https://en.wikipedia.org/wiki/Test)')).toEqual([
      { url: "https://en.wikipedia.org/wiki/Test", start: 1, end: 35 },
    ]);
  });

  it("returns empty when there are no links", () => {
    expect(findLinks("no links here")).toEqual([]);
  });
});

describe("labelForUrl", () => {
  it("lowercases the hostname and strips www.", () => {
    expect(labelForUrl("https://www.TheAtlantic.com/foo")).toBe(
      "theatlantic.com",
    );
    expect(labelForUrl("https://en.wikipedia.org/wiki/X")).toBe(
      "en.wikipedia.org",
    );
  });
});

describe("referencesFor", () => {
  it("returns unique URLs in first-appearance order", () => {
    const text =
      "https://a.com then https://b.com and again https://a.com/extra https://a.com";
    expect(referencesFor(text)).toEqual([
      { url: "https://a.com", label: "a.com" },
      { url: "https://b.com", label: "b.com" },
      { url: "https://a.com/extra", label: "a.com" },
    ]);
  });
});
