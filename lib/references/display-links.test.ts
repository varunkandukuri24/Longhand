import { describe, expect, it } from "vitest";
import { displayLabelFor, displayLinksFor } from "./display-links";

describe("displayLinksFor", () => {
  it("uses stored spans and findLinks for remaining raw URLs", () => {
    const text =
      "Read theatlantic.com and also https://example.com/path please";
    const stored = [
      {
        start: 5,
        end: 5 + "theatlantic.com".length,
        url: "https://www.theatlantic.com/ideas/x",
      },
    ];
    const links = displayLinksFor(text, stored);
    expect(links).toEqual([
      stored[0],
      {
        start: text.indexOf("https://example.com/path"),
        end:
          text.indexOf("https://example.com/path") +
          "https://example.com/path".length,
        url: "https://example.com/path",
      },
    ]);
    expect(displayLabelFor(text, links[1])).toBe("example.com");
  });

  it("works when stored links is null", () => {
    const text = "See https://www.theatlantic.com/x end";
    const links = displayLinksFor(text, null);
    expect(links).toHaveLength(1);
    expect(displayLabelFor(text, links[0])).toBe("theatlantic.com");
  });
});
