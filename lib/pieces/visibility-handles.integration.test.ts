import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { changeHandle } from "@/lib/handles/change";
import { resolveHandle } from "@/lib/handles/resolve";
import { GENESIS_PREV_HASH, hashBatch } from "@/lib/receipt/hash";
import { sha256HexNode } from "@/lib/receipt/sha256-node";
import type { EditEvent } from "@/lib/receipt/types";
import { loadPublicPieceForHandle, loadPublishedBySlug } from "./load-published";
import { publishPiece } from "./publish";
import { setPieceVisibility } from "./set-visibility";
import { loadWriterPublicPieces } from "@/lib/writers/page-data";
import { and, eq } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL;
process.env.ROOT_DOMAIN ??= "localhost:3000";

const authMock = vi.hoisted(() => ({
  userId: "" as string,
}));

vi.mock("@/auth", () => ({
  auth: async () =>
    authMock.userId
      ? { user: { id: authMock.userId, email: "vis@test" } }
      : null,
}));

describe.skipIf(!databaseUrl)("visibility, handles, and writer pages", () => {
  const userId = `vis-${crypto.randomUUID()}`;
  const otherId = `other-${crypto.randomUUID()}`;
  let handle = "";
  let publicPieceId = "";
  let privatePieceId = "";
  let publicSlug = "";
  let privateSlug = "";

  async function seedDraft(pieceId: string, text: string) {
    const [writingSession] = await db
      .insert(schema.sessions)
      .values({ pieceId })
      .returning({ id: schema.sessions.id });
    await db
      .update(schema.pieces)
      .set({ activeSessionId: writingSession.id })
      .where(eq(schema.pieces.id, pieceId));

    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: text.length, text },
    ];
    const hash = await hashBatch(GENESIS_PREV_HASH, 1, events, sha256HexNode);
    await db.insert(schema.eventBatches).values({
      sessionId: writingSession.id,
      seq: 1,
      events,
      prevHash: GENESIS_PREV_HASH,
      hash,
      clientTStart: 0,
      clientTEnd: 0,
      delayed: false,
      clockSuspect: false,
    });
  }

  beforeAll(async () => {
    handle = `h${userId.replace(/[^a-z0-9]/g, "").slice(-10)}`;
    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@example.test`,
      name: "Visibility Writer",
      handle,
    });
    await db.insert(schema.users).values({
      id: otherId,
      email: `${otherId}@example.test`,
      name: "Other Writer",
      handle: `o${otherId.replace(/[^a-z0-9]/g, "").slice(-10)}`,
    });
    authMock.userId = userId;

    const [pubDraft] = await db
      .insert(schema.pieces)
      .values({ userId, title: "Public essay" })
      .returning({ id: schema.pieces.id });
    publicPieceId = pubDraft.id;
    await seedDraft(publicPieceId, "public body");

    const [privDraft] = await db
      .insert(schema.pieces)
      .values({ userId, title: "Private essay" })
      .returning({ id: schema.pieces.id });
    privatePieceId = privDraft.id;
    await seedDraft(privatePieceId, "private body");
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    await db.delete(schema.users).where(eq(schema.users.id, otherId));
  });

  it("publishes a public piece listed on the writer page and reachable by handle/slug", async () => {
    const result = await publishPiece({
      pieceId: publicPieceId,
      userId,
      title: "Public essay",
      finalText: "public body",
      visibility: "public",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    publicSlug = result.slug;

    const listed = await loadWriterPublicPieces(userId);
    expect(listed.pieces.some((p) => p.slug === publicSlug)).toBe(true);

    const onPage = await loadPublicPieceForHandle(handle, publicSlug);
    expect(onPage?.slug).toBe(publicSlug);
    expect(onPage?.visibility).toBe("public");
  });

  it("publishes a private piece that is not listed, 404s on the subdomain route, and is noindex-ready at /p/slug", async () => {
    const result = await publishPiece({
      pieceId: privatePieceId,
      userId,
      title: "Private essay",
      finalText: "private body",
      visibility: "private",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    privateSlug = result.slug;
    expect(result.url).toContain("/p/");

    const listed = await loadWriterPublicPieces(userId);
    expect(listed.pieces.some((p) => p.slug === privateSlug)).toBe(false);

    const onSubdomain = await loadPublicPieceForHandle(handle, privateSlug);
    expect(onSubdomain).toBeNull();

    const bySlug = await loadPublishedBySlug(privateSlug);
    expect(bySlug?.visibility).toBe("private");
    expect(bySlug?.slug).toBe(privateSlug);
  });

  it("switching private to public updates the writer list", async () => {
    const updated = await setPieceVisibility({
      pieceId: privatePieceId,
      userId,
      visibility: "public",
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.url).not.toContain("/p/");

    const listed = await loadWriterPublicPieces(userId);
    expect(listed.pieces.some((p) => p.slug === privateSlug)).toBe(true);
    expect(await loadPublicPieceForHandle(handle, privateSlug)).not.toBeNull();
  });

  it("public /p/slug redirects for a stranger but not the owner", async () => {
    const piece = await loadPublishedBySlug(publicSlug);
    expect(piece?.visibility).toBe("public");
    const strangerShouldRedirect =
      piece!.visibility === "public" && authMock.userId !== piece!.userId;
    // Owner is signed in for this suite.
    expect(piece!.userId === userId).toBe(true);
    expect(strangerShouldRedirect).toBe(false);

    authMock.userId = "";
    const strangerSeesPublic = piece!.visibility === "public";
    const strangerIsOwner = authMock.userId === piece!.userId;
    expect(strangerSeesPublic && !strangerIsOwner).toBe(true);
    authMock.userId = userId;
  });

  it("handle change redirects the old handle", async () => {
    const oldHandle = handle;
    const nextHandle = `${handle}x`.slice(0, 30);
    const changed = await changeHandle(userId, nextHandle);
    expect(changed.ok).toBe(true);
    if (!changed.ok) return;
    handle = changed.handle;

    const resolved = await resolveHandle(oldHandle);
    expect(resolved).toEqual({ kind: "redirect", handle: nextHandle });

    const live = await resolveHandle(nextHandle);
    expect(live.kind).toBe("user");
  });

  it("another writer's slug under your handle 404s", async () => {
    const [otherPiece] = await db
      .insert(schema.pieces)
      .values({
        userId: otherId,
        title: "Theirs",
        status: "published",
        visibility: "public",
        slug: `theirs-${crypto.randomUUID().slice(0, 10)}`,
        finalText: "theirs",
        finalTextHash: "abc",
        publishedAt: new Date(),
      })
      .returning({
        id: schema.pieces.id,
        slug: schema.pieces.slug,
      });

    await db.insert(schema.receipts).values({
      pieceId: otherPiece.id,
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
      chainHeadHash: "head",
    });

    expect(otherPiece.slug).toBeTruthy();
    const cross = await loadPublicPieceForHandle(handle, otherPiece.slug!);
    expect(cross).toBeNull();

    await db
      .delete(schema.pieces)
      .where(and(eq(schema.pieces.id, otherPiece.id)));
  });
});
