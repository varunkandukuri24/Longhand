import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL;

async function expectNotFound(run: () => Promise<unknown>) {
  try {
    await run();
    expect.fail("expected notFound()");
  } catch (err) {
    const digest =
      err && typeof err === "object" && "digest" in err
        ? String((err as { digest: unknown }).digest)
        : "";
    expect(digest).toContain("404");
  }
}

describe.skipIf(!databaseUrl)("opengraph-image notFound", () => {
  const userId = `og-${crypto.randomUUID()}`;
  const handle = `og${userId.replace(/[^a-z0-9]/g, "").slice(-10)}`;
  let privateSlug = "";

  beforeAll(async () => {
    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@example.test`,
      name: "OG Writer",
      handle,
    });

    privateSlug = `priv-${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;
    const [piece] = await db
      .insert(schema.pieces)
      .values({
        userId,
        title: "Private OG",
        status: "published",
        visibility: "private",
        slug: privateSlug,
        finalText: "secret",
        finalTextHash: "c".repeat(64),
        publishedAt: new Date(),
      })
      .returning({ id: schema.pieces.id });

    await db.insert(schema.receipts).values({
      pieceId: piece.id,
      metrics: {
        version: 1,
        activeWritingTimeMs: 60_000,
        elapsedSpanMs: 60_000,
        typedShare: 1,
        pastedShare: 0,
        quotedShare: 0,
        revisionRatio: 1,
        sessionCount: 1,
        wordCount: 1,
        fastStretchCount: 0,
        uniformTypingRunCount: 0,
        delayedBatchCount: 0,
        sessionRows: [],
        sittingRows: [],
      },
      chainHeadHash: "d".repeat(64),
    });
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.id, userId));
  });

  it("/p/[slug]/opengraph-image returns 404 for a made-up slug", async () => {
    const { default: Image } = await import(
      "@/app/p/[slug]/opengraph-image"
    );
    await expectNotFound(() =>
      Image({ params: Promise.resolve({ slug: "no-such-slug-zzzzzzzzzz" }) }),
    );
  });

  it("/u/[handle]/opengraph-image returns 404 for a made-up handle", async () => {
    const { default: Image } = await import(
      "@/app/u/[handle]/opengraph-image"
    );
    await expectNotFound(() =>
      Image({
        params: Promise.resolve({ handle: "no-such-handle-zzzzzz" }),
      }),
    );
  });

  it("/u/[handle]/[slug]/opengraph-image returns 404 for a made-up slug", async () => {
    const { default: Image } = await import(
      "@/app/u/[handle]/[slug]/opengraph-image"
    );
    await expectNotFound(() =>
      Image({
        params: Promise.resolve({
          handle,
          slug: "no-such-slug-zzzzzzzzzz",
        }),
      }),
    );
  });

  it("/u/[handle]/[slug]/opengraph-image returns 404 for a private piece", async () => {
    const { default: Image } = await import(
      "@/app/u/[handle]/[slug]/opengraph-image"
    );
    await expectNotFound(() =>
      Image({
        params: Promise.resolve({ handle, slug: privateSlug }),
      }),
    );
  });
});
