import { describe, expect, it } from "vitest";
import {
  parseWritingFont,
  parseWritingSize,
  phoneWritingSize,
  writingFontCssVar,
} from "./type-prefs";

describe("type prefs", () => {
  it("parses fonts and sizes with defaults", () => {
    expect(parseWritingFont("dm-mono")).toBe("dm-mono");
    expect(parseWritingFont("nope")).toBe("literata");
    expect(parseWritingSize(24)).toBe(24);
    expect(parseWritingSize("22")).toBe(22);
    expect(parseWritingSize(99)).toBe(20);
  });

  it("drops one size step on phones", () => {
    expect(phoneWritingSize(20)).toBe(18);
    expect(phoneWritingSize(24)).toBe(22);
    expect(phoneWritingSize(18)).toBe(18);
  });

  it("maps fonts to CSS font stacks", () => {
    expect(writingFontCssVar("literata")).toContain("--font-literata");
    expect(writingFontCssVar("newsreader")).toContain("--font-newsreader");
    expect(writingFontCssVar("instrument-sans")).toContain(
      "--font-instrument-sans",
    );
    expect(writingFontCssVar("dm-mono")).toContain("--font-dm-mono");
  });
});
