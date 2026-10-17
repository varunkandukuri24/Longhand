import { describe, expect, it } from "vitest";
import { makePieceSlug } from "./slug";

describe("makePieceSlug", () => {
  it("slugifies the title and appends a suffix", () => {
    expect(makePieceSlug("Hello World", "abc123def0")).toBe(
      "hello-world-abc123def0",
    );
  });

  it("falls back to piece when the title is empty", () => {
    expect(makePieceSlug("   ", "zz99aabbcc")).toBe("piece-zz99aabbcc");
  });
});
