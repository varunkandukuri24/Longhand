import { describe, expect, it } from "vitest";
import {
  shortenRemainingUrls,
  urlBeforeWhitespace,
  urlsFollowedByWhitespaceInRange,
} from "./shorten";

describe("urlBeforeWhitespace", () => {
  it("finds a URL ending at the whitespace", () => {
    const text = "https://www.theatlantic.com/ideas/x ";
    expect(urlBeforeWhitespace(text, text.length - 1)).toEqual({
      start: 0,
      end: "https://www.theatlantic.com/ideas/x".length,
      url: "https://www.theatlantic.com/ideas/x",
    });
  });

  it("leaves trailing punctuation outside the URL", () => {
    const text = "See https://example.com). ";
    const ws = text.length - 1;
    expect(urlBeforeWhitespace(text, ws)).toEqual({
      start: 4,
      end: 4 + "https://example.com".length,
      url: "https://example.com",
    });
  });
});

describe("urlsFollowedByWhitespaceInRange", () => {
  it("finds pasted URLs already followed by whitespace", () => {
    const paste = "https://a.com/x more https://b.com";
    const text = `Hi ${paste}`;
    const start = 3;
    const found = urlsFollowedByWhitespaceInRange(
      text,
      start,
      start + paste.length,
    );
    expect(found).toEqual([
      {
        start: 3,
        end: 3 + "https://a.com/x".length,
        url: "https://a.com/x",
      },
    ]);
  });
});

describe("shortenRemainingUrls", () => {
  it("shortens raw URLs without changing existing spans' urls", () => {
    const text = "See https://example.com/path please";
    const { text: out, links } = shortenRemainingUrls(text, []);
    expect(out).toBe("See example.com please");
    expect(links).toEqual([
      {
        start: 4,
        end: 4 + "example.com".length,
        url: "https://example.com/path",
      },
    ]);
  });
});
