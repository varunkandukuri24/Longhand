import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { GENESIS_PREV_HASH, hashBatch } from "@/lib/receipt/hash";
import { sha256HexNode } from "@/lib/receipt/sha256-node";
import type { EditEvent } from "@/lib/receipt/types";

const url = process.env.DATABASE_URL;

const authMock = vi.hoisted(() => ({
  userId: "" as string,
}));

vi.mock("@/auth", () => ({
  auth: async () =>
    authMock.userId
      ? { user: { id: authMock.userId, email: "publish@test" } }
      : null,
}));

describe.skipIf(!url)("publish piece", () => {
  const client = postgres(url!, { max: 1 });
  const db = drizzle(client, { schema });
  const userId = `publish-${crypto.randomUUID()}`;
  let draftPieceId = "";
  let tamperPieceId = "";
  let publishPiece: typeof import("./publish").publishPiece;
  let POST_batches: typeof import("@/app/api/pieces/[id]/batches/route").POST;
  let POST_publish: typeof import("@/app/api/pieces/[id]/publish/route").POST;

  beforeAll(async () => {
    ({ publishPiece } = await import("./publish"));
    ({ POST: POST_batches } = await import(
      "@/app/api/pieces/[id]/batches/route"
    ));
    ({ POST: POST_publish } = await import(
      "@/app/api/pieces/[id]/publish/route"
    ));

    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@example.test`,
      name: "Publisher",
    });
    authMock.userId = userId;

    const [draft] = await db
      .insert(schema.pieces)
      .values({ userId, title: "draft" })
      .returning({ id: schema.pieces.id });
    draftPieceId = draft.id;

    const [tamper] = await db
      .insert(schema.pieces)
      .values({ userId, title: "tamper" })
      .returning({ id: schema.pieces.id });
    tamperPieceId = tamper.id;

    async function seedBatch(pieceId: string, text: string) {
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
        { t: 500, type: "insert", pos: text.length, len: 1, text: "!" },
      ];
      const hash = await hashBatch(GENESIS_PREV_HASH, 1, events, sha256HexNode);
      await db.insert(schema.eventBatches).values({
        sessionId: writingSession.id,
        seq: 1,
        events,
        prevHash: GENESIS_PREV_HASH,
        hash,
        clientTStart: 0,
        clientTEnd: 500,
        delayed: false,
        clockSuspect: false,
      });
      return { sessionId: writingSession.id, finalText: `${text}!` };
    }

    await seedBatch(draftPieceId, "hello");
    await seedBatch(tamperPieceId, "hello");
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    await client.end();
  });

  it("publishes when rebuilt text matches final text", async () => {
    const result = await publishPiece({
      pieceId: draftPieceId,
      userId,
      title: "Hello world",
      finalText: "hello!",
      replayPublic: false,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.slug).toMatch(/^hello-world-[a-z0-9]{6}$/);

    const [piece] = await db
      .select({
        status: schema.pieces.status,
        slug: schema.pieces.slug,
        finalText: schema.pieces.finalText,
        finalTextHash: schema.pieces.finalTextHash,
        replayPublic: schema.pieces.replayPublic,
      })
      .from(schema.pieces)
      .where(eq(schema.pieces.id, draftPieceId));

    expect(piece.status).toBe("published");
    expect(piece.slug).toBe(result.slug);
    expect(piece.finalText).toBe("hello!");
    expect(piece.finalTextHash).toBe(result.finalTextHash);
    expect(piece.replayPublic).toBe(false);

    const [receipt] = await db
      .select()
      .from(schema.receipts)
      .where(eq(schema.receipts.pieceId, draftPieceId));
    expect(receipt.chainHeadHash).toBe(result.chainHeadHash);
    expect(receipt.metrics.wordCount).toBe(1);
    expect(receipt.metrics.sessionRows).toHaveLength(1);
  });

  it("fails with 409 when submitted text does not match stored events", async () => {
    const result = await publishPiece({
      pieceId: tamperPieceId,
      userId,
      title: "Tampered",
      finalText: "hello! EXTRA",
      replayPublic: false,
    });
    expect(result).toEqual({
      ok: false,
      status: 409,
      error: "conflict",
      reason: "text_mismatch",
    });

    const [piece] = await db
      .select({ status: schema.pieces.status })
      .from(schema.pieces)
      .where(eq(schema.pieces.id, tamperPieceId));
    expect(piece.status).toBe("draft");
  });

  it("rejects new batches for a published piece", async () => {
    const [piece] = await db
      .select({
        status: schema.pieces.status,
      })
      .from(schema.pieces)
      .where(eq(schema.pieces.id, draftPieceId));
    expect(piece.status).toBe("published");

    const [session] = await db
      .select({ id: schema.sessions.id })
      .from(schema.sessions)
      .where(eq(schema.sessions.pieceId, draftPieceId))
      .limit(1);

    const events: EditEvent[] = [
      { t: 1000, type: "insert", pos: 0, len: 1, text: "x" },
    ];
    const hash = await hashBatch(GENESIS_PREV_HASH, 99, events, sha256HexNode);

    const res = await POST_batches(
      new Request("http://localhost/api/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: session.id,
          seq: 99,
          events,
          prevHash: GENESIS_PREV_HASH,
          hash,
          delayed: false,
        }),
      }),
      { params: Promise.resolve({ id: draftPieceId }) },
    );

    expect(res.status).toBe(409);
    const body = (await res.json()) as { reason?: string };
    expect(body.reason).toBe("published");

    const stored = await db
      .select({ seq: schema.eventBatches.seq })
      .from(schema.eventBatches)
      .innerJoin(
        schema.sessions,
        eq(schema.eventBatches.sessionId, schema.sessions.id),
      )
      .where(
        and(
          eq(schema.sessions.pieceId, draftPieceId),
          eq(schema.eventBatches.seq, 99),
        ),
      );
    expect(stored).toHaveLength(0);
  });

  it("publish route returns 409 on text mismatch", async () => {
    const res = await POST_publish(
      new Request("http://localhost/api/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "No",
          finalText: "not the rebuilt text",
          replayPublic: false,
        }),
      }),
      { params: Promise.resolve({ id: tamperPieceId }) },
    );
    expect(res.status).toBe(409);
    const body = (await res.json()) as { reason?: string };
    expect(body.reason).toBe("text_mismatch");
  });
});
