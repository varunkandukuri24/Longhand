import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { GENESIS_PREV_HASH, hashBatch } from "@/lib/receipt/hash";
import { sha256HexNode } from "@/lib/receipt/sha256-node";
import type { EditEvent } from "@/lib/receipt/types";
import { applyEvents } from "@/lib/receipt/apply-events";

const url = process.env.DATABASE_URL;

const authMock = vi.hoisted(() => ({
  userId: "" as string,
}));

vi.mock("@/auth", () => ({
  auth: async () =>
    authMock.userId
      ? { user: { id: authMock.userId, email: "link-batch@test" } }
      : null,
}));

describe.skipIf(!url)("link batch + publish (route handlers)", () => {
  const client = postgres(url!, { max: 1 });
  const db = drizzle(client, { schema });
  const userId = `link-batch-${crypto.randomUUID()}`;
  let pieceId = "";
  let sessionId = "";
  let POST_batches: typeof import("@/app/api/pieces/[id]/batches/route").POST;
  let publishPiece: typeof import("./publish").publishPiece;

  beforeAll(async () => {
    ({ POST: POST_batches } = await import(
      "@/app/api/pieces/[id]/batches/route"
    ));
    ({ publishPiece } = await import("./publish"));

    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@example.test`,
      name: "Link Batch",
    });
    authMock.userId = userId;

    const [piece] = await db
      .insert(schema.pieces)
      .values({ userId, title: "link batch draft" })
      .returning({ id: schema.pieces.id });
    pieceId = piece.id;

    const [session] = await db
      .insert(schema.sessions)
      .values({ pieceId })
      .returning({ id: schema.sessions.id });
    sessionId = session.id;
    await db
      .update(schema.pieces)
      .set({ activeSessionId: sessionId })
      .where(eq(schema.pieces.id, pieceId));
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    await client.end();
  });

  async function postBatch(args: {
    seq: number;
    prevHash: string;
    events: EditEvent[];
  }) {
    const hash = await hashBatch(
      args.prevHash,
      args.seq,
      args.events,
      sha256HexNode,
    );
    const res = await POST_batches(
      new Request("http://localhost/api/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId,
          seq: args.seq,
          events: args.events,
          prevHash: args.prevHash,
          hash,
          delayed: false,
        }),
      }),
      { params: Promise.resolve({ id: pieceId }) },
    );
    return { res, hash };
  }

  it("accepts typing, paste, link, and more typing, then publishes", async () => {
    const urlText = "https://www.nytimes.com/x/";
    const label = "nytimes.com";

    const batch1: EditEvent[] = [
      {
        t: 0,
        type: "insert",
        pos: 0,
        len: 3,
        text: "hi ",
      },
      {
        t: 40,
        type: "paste",
        pos: 3,
        len: urlText.length,
        text: urlText,
      },
    ];
    const { res: res1, hash: hash1 } = await postBatch({
      seq: 1,
      prevHash: GENESIS_PREV_HASH,
      events: batch1,
    });
    expect(res1.status).toBe(200);

    const batch2: EditEvent[] = [
      {
        t: 80,
        type: "link",
        pos: 3,
        len: urlText.length,
        text: label,
        url: urlText,
      },
      {
        t: 120,
        type: "insert",
        pos: 3 + label.length,
        len: 6,
        text: " there",
      },
    ];
    const { res: res2, hash: hash2 } = await postBatch({
      seq: 2,
      prevHash: hash1,
      events: batch2,
    });
    expect(res2.status).toBe(200);
    expect(hash2).not.toBe(hash1);

    const allEvents = [...batch1, ...batch2];
    const rebuilt = applyEvents(allEvents);
    expect(rebuilt.text).toBe("hi nytimes.com there");
    expect(rebuilt.links).toEqual([
      { start: 3, end: 3 + label.length, url: urlText },
    ]);

    const result = await publishPiece({
      pieceId,
      userId,
      title: "NYT link",
      finalText: rebuilt.text,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [piece] = await db
      .select({
        status: schema.pieces.status,
        finalText: schema.pieces.finalText,
        links: schema.pieces.links,
      })
      .from(schema.pieces)
      .where(eq(schema.pieces.id, pieceId));

    expect(piece.status).toBe("published");
    expect(piece.finalText).toBe("hi nytimes.com there");
    expect(piece.links).toEqual([
      { start: 3, end: 3 + label.length, url: urlText },
    ]);
    expect(piece.finalText).not.toContain("https://");
  });

  it("refuses a link event whose label does not match the url hostname", async () => {
    const pieceUser = `bad-link-${crypto.randomUUID()}`;
    await db.insert(schema.users).values({
      id: pieceUser,
      email: `${pieceUser}@example.test`,
      name: "Bad Link",
    });
    authMock.userId = pieceUser;
    const [piece] = await db
      .insert(schema.pieces)
      .values({ userId: pieceUser, title: "bad" })
      .returning({ id: schema.pieces.id });
    const [sess] = await db
      .insert(schema.sessions)
      .values({ pieceId: piece.id })
      .returning({ id: schema.sessions.id });
    await db
      .update(schema.pieces)
      .set({ activeSessionId: sess.id })
      .where(eq(schema.pieces.id, piece.id));

    const url = "https://example.com/x";
    const typed: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 0, text: url },
    ];
    const hash1 = await hashBatch(
      GENESIS_PREV_HASH,
      1,
      typed,
      sha256HexNode,
    );
    const res1 = await POST_batches(
      new Request("http://localhost/api/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: sess.id,
          seq: 1,
          events: typed,
          prevHash: GENESIS_PREV_HASH,
          hash: hash1,
          delayed: false,
        }),
      }),
      { params: Promise.resolve({ id: piece.id }) },
    );
    expect(res1.status).toBe(200);

    const forged: EditEvent[] = [
      {
        t: 10,
        type: "link",
        pos: 0,
        len: url.length,
        text: "a".repeat(5000),
        url,
      },
    ];
    const hash2 = await hashBatch(hash1, 2, forged, sha256HexNode);
    const res2 = await POST_batches(
      new Request("http://localhost/api/batches", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: sess.id,
          seq: 2,
          events: forged,
          prevHash: hash1,
          hash: hash2,
          delayed: false,
        }),
      }),
      { params: Promise.resolve({ id: piece.id }) },
    );
    expect(res2.status).toBe(422);
    const body = (await res2.json()) as { reason?: string };
    expect(body.reason).toBe("invalid_event");

    await db.delete(schema.users).where(eq(schema.users.id, pieceUser));
    authMock.userId = userId;
  });

  it("keeps draft_text equal to the state route rebuild", async () => {
    const [row] = await db
      .select({ draftText: schema.pieces.draftText })
      .from(schema.pieces)
      .where(eq(schema.pieces.id, pieceId));
    const { loadPieceState } = await import("./load-state");
    const state = await loadPieceState(pieceId);
    // Piece was published in the first test; final text is frozen. draft_text
    // should still match the last accepted rebuild before publish.
    expect(row.draftText).toBe(state.text);
    expect(state.text).toBe("hi nytimes.com there");
  });
});
