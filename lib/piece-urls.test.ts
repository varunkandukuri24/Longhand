import { afterEach, describe, expect, it } from "vitest";
import { pieceUrl, privateUrl, publicUrl, writerPageUrl } from "./piece-urls";

describe("piece URL helpers", () => {
  const prevRoot = process.env.ROOT_DOMAIN;
  const prevEnv = process.env.VERCEL_ENV;
  const prevBranch = process.env.VERCEL_BRANCH_URL;

  afterEach(() => {
    if (prevRoot === undefined) {
      delete process.env.ROOT_DOMAIN;
    } else {
      process.env.ROOT_DOMAIN = prevRoot;
    }
    if (prevEnv === undefined) {
      delete process.env.VERCEL_ENV;
    } else {
      process.env.VERCEL_ENV = prevEnv;
    }
    if (prevBranch === undefined) {
      delete process.env.VERCEL_BRANCH_URL;
    } else {
      process.env.VERCEL_BRANCH_URL = prevBranch;
    }
  });

  it("builds public, private, and writer page URLs", () => {
    process.env.ROOT_DOMAIN = "localhost:3000";
    delete process.env.VERCEL_ENV;
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
    delete process.env.VERCEL_ENV;
    expect(publicUrl({ slug: "a" }, "sam")).toBe(
      "https://sam.longhand.example/a",
    );
  });

  it("uses /u/{handle} URLs on a Vercel preview", () => {
    delete process.env.ROOT_DOMAIN;
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_BRANCH_URL = "longhand-git-test.vercel.app";
    expect(writerPageUrl("ada")).toBe(
      "https://longhand-git-test.vercel.app/u/ada",
    );
    expect(publicUrl({ slug: "hello" }, "ada")).toBe(
      "https://longhand-git-test.vercel.app/u/ada/hello",
    );
    expect(privateUrl({ slug: "secret" })).toBe(
      "https://longhand-git-test.vercel.app/p/secret",
    );
  });
});
