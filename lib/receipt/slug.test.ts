import { describe, expect, it } from "vitest";
import { makePieceSlug } from "./slug";

describe("makePieceSlug", () => {
  it("slugifies the title and appends a suffix", () => {
    expect(makePieceSlug("Hello World", "abc123")).toBe("hello-world-abc123");
  });

  it("falls back to piece when the title is empty", () => {
    expect(makePieceSlug("   ", "zz99aa")).toBe("piece-zz99aa");
  });
});
