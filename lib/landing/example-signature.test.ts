import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseExamplePieceUrl } from "./example-signature";

describe("parseExamplePieceUrl", () => {
  it("parses /p/{slug} paths and absolute private URLs", () => {
    expect(
      parseExamplePieceUrl("/p/hello-world", { domain: "typelonghand.com" }),
    ).toEqual({ kind: "slug", slug: "hello-world" });
    expect(
      parseExamplePieceUrl("https://typelonghand.com/p/hello-world", {
        domain: "typelonghand.com",
      }),
    ).toEqual({ kind: "slug", slug: "hello-world" });
    expect(
      parseExamplePieceUrl("typelonghand.com/p/hello-world", {
        domain: "typelonghand.com",
      }),
    ).toEqual({ kind: "slug", slug: "hello-world" });
  });

  it("parses {handle}.{domain}/{slug} URLs", () => {
    expect(
      parseExamplePieceUrl("https://ada.typelonghand.com/morning-pages", {
        domain: "typelonghand.com",
      }),
    ).toEqual({
      kind: "handle-slug",
      handle: "ada",
      slug: "morning-pages",
    });
    expect(
      parseExamplePieceUrl("ada.typelonghand.com/morning-pages", {
        domain: "typelonghand.com",
      }),
    ).toEqual({
      kind: "handle-slug",
      handle: "ada",
      slug: "morning-pages",
    });
  });

  it("parses preview /u/{handle}/{slug} when preview is set", () => {
    expect(
      parseExamplePieceUrl("/u/ada/morning-pages", {
        domain: "example.vercel.app",
        preview: true,
      }),
    ).toEqual({
      kind: "handle-slug",
      handle: "ada",
      slug: "morning-pages",
    });
    expect(
      parseExamplePieceUrl("/u/ada/morning-pages", {
        domain: "example.vercel.app",
        preview: false,
      }),
    ).toBeNull();
  });

  it("returns null for empty, junk, or unmatched shapes", () => {
    expect(parseExamplePieceUrl("", { domain: "typelonghand.com" })).toBeNull();
    expect(
      parseExamplePieceUrl("   ", { domain: "typelonghand.com" }),
    ).toBeNull();
    expect(
      parseExamplePieceUrl("https://typelonghand.com/", {
        domain: "typelonghand.com",
      }),
    ).toBeNull();
    expect(
      parseExamplePieceUrl("https://typelonghand.com/about", {
        domain: "typelonghand.com",
      }),
    ).toBeNull();
    expect(
      parseExamplePieceUrl("not a url", { domain: "typelonghand.com" }),
    ).toBeNull();
  });
});

describe("getExampleSignature", () => {
  const loadPublishedBySlug = vi.fn();
  const loadPublicPieceForHandle = vi.fn();

  beforeEach(() => {
    vi.resetModules();
    loadPublishedBySlug.mockReset();
    loadPublicPieceForHandle.mockReset();
    delete process.env.EXAMPLE_PIECE_URL;
    process.env.ROOT_DOMAIN = "typelonghand.com";
    delete process.env.VERCEL_ENV;

    vi.doMock("@/lib/pieces/load-published", () => ({
      loadPublishedBySlug,
      loadPublicPieceForHandle,
    }));
  });

  afterEach(() => {
    vi.doUnmock("@/lib/pieces/load-published");
    vi.resetModules();
  });

  it("returns null when EXAMPLE_PIECE_URL is unset", async () => {
    const { getExampleSignature } = await import("./example-signature");
    expect(await getExampleSignature()).toBeNull();
    expect(loadPublishedBySlug).not.toHaveBeenCalled();
  });

  it("returns null when the URL does not resolve to a piece", async () => {
    process.env.EXAMPLE_PIECE_URL = "https://typelonghand.com/p/missing";
    loadPublishedBySlug.mockResolvedValue(null);
    const { getExampleSignature } = await import("./example-signature");
    expect(await getExampleSignature()).toBeNull();
    expect(loadPublishedBySlug).toHaveBeenCalledWith("missing");
  });

  it("loads a private /p/{slug} piece and formats the signature", async () => {
    process.env.EXAMPLE_PIECE_URL = "https://typelonghand.com/p/demo";
    loadPublishedBySlug.mockResolvedValue({
      slug: "demo",
      visibility: "private",
      authorName: "Ada",
      authorHandle: "ada",
      metrics: {
        typedShare: 1,
        activeWritingTimeMs: 120_000,
        sittingRows: [{ startedAt: Date.UTC(2026, 0, 15), activeWritingTimeMs: 120_000, wordsAdded: 40 }],
        sessionRows: [],
      },
    });
    const { getExampleSignature } = await import("./example-signature");
    const result = await getExampleSignature();
    expect(result).toEqual({
      sentence: "Ada wrote this by hand.",
      meta: expect.stringContaining("2 min over 1 sitting"),
      href: "https://typelonghand.com/p/demo",
    });
  });

  it("loads a {handle}.{domain}/{slug} piece", async () => {
    process.env.EXAMPLE_PIECE_URL =
      "https://ada.typelonghand.com/morning-pages";
    loadPublicPieceForHandle.mockResolvedValue({
      slug: "morning-pages",
      visibility: "public",
      authorName: "Ada",
      authorHandle: "ada",
      metrics: {
        typedShare: 0.8,
        activeWritingTimeMs: 60_000,
        sittingRows: [{ startedAt: Date.UTC(2026, 0, 15), activeWritingTimeMs: 60_000, wordsAdded: 20 }],
        sessionRows: [],
      },
    });
    const { getExampleSignature } = await import("./example-signature");
    const result = await getExampleSignature();
    expect(result).toEqual({
      sentence: "Ada wrote most of this by hand.",
      meta: expect.stringContaining("1 min over 1 sitting"),
      href: "https://ada.typelonghand.com/morning-pages",
    });
    expect(loadPublicPieceForHandle).toHaveBeenCalledWith(
      "ada",
      "morning-pages",
    );
  });
});
