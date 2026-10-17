import { afterEach, describe, expect, it } from "vitest";
import { pieceUrl, privateUrl, publicUrl, writerPageUrl } from "./piece-urls";

describe("piece URL helpers", () => {
  const prev = process.env.ROOT_DOMAIN;

  afterEach(() => {
    if (prev === undefined) {
      delete process.env.ROOT_DOMAIN;
    } else {
      process.env.ROOT_DOMAIN = prev;
    }
  });

  it("builds public, private, and writer page URLs", () => {
    process.env.ROOT_DOMAIN = "localhost:3000";
    expect(publicUrl({ slug: "hello-abc123def0" }, "anon24")).toBe(
      "http://anon24.localhost:3000/hello-abc123def0",
    );
    expect(privateUrl({ slug: "hello-abc123def0" })).toBe(
      "http://localhost:3000/p/hello-abc123def0",
    );
    expect(writerPageUrl("anon24")).toBe("http://anon24.localhost:3000");
    expect(
      pieceUrl({ slug: "x", visibility: "public" }, "anon24"),
    ).toBe("http://anon24.localhost:3000/x");
    expect(
      pieceUrl({ slug: "x", visibility: "private" }, "anon24"),
    ).toBe("http://localhost:3000/p/x");
  });

  it("uses https outside localhost", () => {
    process.env.ROOT_DOMAIN = "longhand.example";
    expect(publicUrl({ slug: "a" }, "sam")).toBe(
      "https://sam.longhand.example/a",
    );
  });
});
