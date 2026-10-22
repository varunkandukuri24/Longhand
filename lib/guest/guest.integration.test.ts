import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import { GENESIS_PREV_HASH, hashBatch } from "@/lib/receipt/hash";
import { sha256HexNode } from "@/lib/receipt/sha256-node";
import type { EditEvent } from "@/lib/receipt/types";
import { computeReceipt } from "@/lib/receipt/compute-receipt";
import { hashRateLimitKey } from "@/lib/rate-limit";
import { GUEST_CHAR_LIMIT, GUEST_WORD_LIMIT } from "./limits";

process.env.AUTH_SECRET ??= "test-secret-for-guest-hmac";

const databaseUrl = process.env.DATABASE_URL;

const cookieMock = vi.hoisted(() => ({ value: "" as string }));
const authMock = vi.hoisted(() => ({ userId: "" as string }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "lh_guest" && cookieMock.value
        ? { value: cookieMock.value }
        : undefined,
    set: () => {},
    delete: () => {},
  }),
  headers: async () => ({
    get: (name: string) =>
      name === "x-forwarded-for" ? "203.0.113.50" : null,
  }),
}));

vi.mock("@/auth", () => ({
  auth: async () =>
    authMock.userId
      ? { user: { id: authMock.userId, email: "guest@test" } }
      : null,
}));

describe.skipIf(!databaseUrl)("guest pieces", () => {
  let client: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  const suffix = crypto.randomUUID().slice(0, 8);
  const userId = `guest-claim-${suffix}`;
  let createOrGetGuestPieceFor: typeof import("./create-piece").createOrGetGuestPieceFor;
  let claimGuestPieces: typeof import("./claim").claimGuestPieces;
  let deleteUnclaimedGuestsOlderThan: typeof import("./cleanup").deleteUnclaimedGuestsOlderThan;
  let lookupGuestByToken: typeof import("./get-guest").lookupGuestByToken;
  let POST_batches: typeof import("@/app/api/pieces/[id]/batches/route").POST;
  let POST_publish: typeof import("@/app/api/pieces/[id]/publish/route").POST;
  let publishPiece: typeof import("@/lib/pieces/publish").publishPiece;
  let loadReceiptBatches: typeof import("@/lib/pieces/load-batches").loadReceiptBatches;

  beforeAll(async () => {
    client = postgres(databaseUrl!, { max: 1 });
    db = drizzle(client, { schema });
    ({ createOrGetGuestPieceFor } = await import("./create-piece"));
    ({ claimGuestPieces } = await import("./claim"));
    ({ deleteUnclaimedGuestsOlderThan } = await import("./cleanup"));
    ({ lookupGuestByToken } = await import("./get-guest"));
    ({ POST: POST_batches } = await import(
      "@/app/api/pieces/[id]/batches/route"
    ));
    ({ POST: POST_publish } = await import(
      "@/app/api/pieces/[id]/publish/route"
    ));
    ({ publishPiece } = await import("@/lib/pieces/publish"));
    ({ loadReceiptBatches } = await import("@/lib/pieces/load-batches"));

    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@example.test`,
      name: "Guest Claim",
      handle: `gc-${suffix}`,
    });
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    await client.end();
  });

  it("refuses a 4th new guest piece from one IP in a day", async () => {
    const ip = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
    const created: string[] = [];
    for (let i = 0; i < 3; i += 1) {
      const result = await createOrGetGuestPieceFor({
        existingToken: null,
        ip,
      });
      expect(result.ok).toBe(true);
      if (result.ok) created.push(result.pieceId);
    }
    const fourth = await createOrGetGuestPieceFor({
      existingToken: null,
      ip,
    });
    expect(fourth.ok).toBe(false);
    if (!fourth.ok) {
      expect(fourth.error).toBe("guest_create_limit");
    }

    const first = await createOrGetGuestPieceFor({
      existingToken: null,
      ip,
    });
    expect(first.ok).toBe(false);

    const [guestRow] = await db
      .select({ ipHash: schema.guests.ipHash })
      .from(schema.guests)
      .innerJoin(schema.pieces, eq(schema.pieces.guestId, schema.guests.id))
      .where(eq(schema.pieces.id, created[0]!))
      .limit(1);
    expect(guestRow?.ipHash).toBe(hashRateLimitKey(ip));
    expect(guestRow?.ipHash).not.toBe(ip);

    const hits = await db
      .select({ keyHash: schema.rateLimitHits.keyHash, bucket: schema.rateLimitHits.bucket })
      .from(schema.rateLimitHits)
      .where(eq(schema.rateLimitHits.bucket, "guest_create_ip"));
    expect(hits.some((h) => h.keyHash === ip)).toBe(false);
    expect(hits.some((h) => h.keyHash === hashRateLimitKey(ip))).toBe(true);
  });

  it("lookup of a missing cookie creates no rows", async () => {
    const before = await db
      .select({ n: sql<number>`count(*)` })
      .from(schema.guests);
    const found = await lookupGuestByToken("not-a-real-token");
    expect(found).toBeNull();
    const after = await db
      .select({ n: sql<number>`count(*)` })
      .from(schema.guests);
    expect(Number(after[0]?.n)).toBe(Number(before[0]?.n));
  });

  it("lets guest A write to A and not to B, and refuses guest publish", async () => {
    const ip = `198.51.100.${20 + (Number.parseInt(suffix.slice(0, 2), 16) % 200)}`;
    const a = await createOrGetGuestPieceFor({ existingToken: null, ip });
    const b = await createOrGetGuestPieceFor({ existingToken: null, ip });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    async function startSession(pieceId: string) {
      const [row] = await db
        .insert(schema.sessions)
        .values({ pieceId })
        .returning({ id: schema.sessions.id });
      await db
        .update(schema.pieces)
        .set({ activeSessionId: row.id })
        .where(eq(schema.pieces.id, pieceId));
      return row.id;
    }

    const sessionA = await startSession(a.pieceId);
    await startSession(b.pieceId);

    cookieMock.value = a.token;
    authMock.userId = "";

    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 5, text: "hello" },
    ];
    const hash = await hashBatch(GENESIS_PREV_HASH, 1, events, sha256HexNode);

    const own = await POST_batches(
      new Request(`http://localhost/api/pieces/${a.pieceId}/batches`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionA,
          seq: 1,
          events,
          prevHash: GENESIS_PREV_HASH,
          hash,
          delayed: false,
          clientTStart: 0,
          clientTEnd: 0,
        }),
      }),
      { params: Promise.resolve({ id: a.pieceId }) },
    );
    expect(own.status).toBe(200);

    const other = await POST_batches(
      new Request(`http://localhost/api/pieces/${b.pieceId}/batches`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionA,
          seq: 1,
          events,
          prevHash: GENESIS_PREV_HASH,
          hash,
          delayed: false,
          clientTStart: 0,
          clientTEnd: 0,
        }),
      }),
      { params: Promise.resolve({ id: b.pieceId }) },
    );
    expect(other.status).toBe(404);

    const publish = await POST_publish(
      new Request(`http://localhost/api/pieces/${a.pieceId}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: "Nope",
          finalText: "hello",
          visibility: "public",
        }),
      }),
      { params: Promise.resolve({ id: a.pieceId }) },
    );
    expect(publish.status).toBe(401);
  });

  it("rejects a guest batch that would exceed 500 words or 4000 characters", async () => {
    const made = await createOrGetGuestPieceFor({
      existingToken: null,
      ip: `198.51.101.${20 + (Number.parseInt(suffix.slice(2, 4), 16) % 200)}`,
    });
    expect(made.ok).toBe(true);
    if (!made.ok) return;
    const pieceId = made.pieceId;
    const token = made.token;

    const [session] = await db
      .insert(schema.sessions)
      .values({ pieceId })
      .returning({ id: schema.sessions.id });
    await db
      .update(schema.pieces)
      .set({ activeSessionId: session.id })
      .where(eq(schema.pieces.id, pieceId));

    cookieMock.value = token;
    authMock.userId = "";

    async function postText(text: string) {
      const events: EditEvent[] = [
        { t: 0, type: "insert", pos: 0, len: text.length, text },
      ];
      const hash = await hashBatch(GENESIS_PREV_HASH, 1, events, sha256HexNode);
      return POST_batches(
        new Request(`http://localhost/api/pieces/${pieceId}/batches`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            sessionId: session.id,
            seq: 1,
            events,
            prevHash: GENESIS_PREV_HASH,
            hash,
            delayed: false,
            clientTStart: 0,
            clientTEnd: 0,
          }),
        }),
        { params: Promise.resolve({ id: pieceId }) },
      );
    }

    const tooManyWords = Array.from(
      { length: GUEST_WORD_LIMIT + 1 },
      () => "word",
    ).join(" ");
    const wordRes = await postText(tooManyWords);
    expect(wordRes.status).toBe(403);
    expect(await wordRes.json()).toEqual({ error: "guest_limit" });

    const charRes = await postText("a".repeat(GUEST_CHAR_LIMIT + 1));
    expect(charRes.status).toBe(403);
  });

  it("claims a guest piece without touching batches, and the receipt matches", async () => {
    const made = await createOrGetGuestPieceFor({
      existingToken: null,
      ip: `198.51.102.${20 + (Number.parseInt(suffix.slice(4, 6), 16) % 200)}`,
    });
    expect(made.ok).toBe(true);
    if (!made.ok) return;

    const [session] = await db
      .insert(schema.sessions)
      .values({ pieceId: made.pieceId, startedAt: new Date("2026-10-01T10:00:00Z") })
      .returning({ id: schema.sessions.id });
    await db
      .update(schema.pieces)
      .set({ activeSessionId: session.id })
      .where(eq(schema.pieces.id, made.pieceId));

    const batch1Events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 5, text: "hello" },
      { t: 1000, type: "insert", pos: 5, len: 1, text: " " },
    ];
    const hash1 = await hashBatch(
      GENESIS_PREV_HASH,
      1,
      batch1Events,
      sha256HexNode,
    );
    const batch2Events: EditEvent[] = [
      { t: 2000, type: "insert", pos: 6, len: 5, text: "world" },
    ];
    const hash2 = await hashBatch(hash1, 2, batch2Events, sha256HexNode);

    await db.insert(schema.eventBatches).values([
      {
        sessionId: session.id,
        seq: 1,
        events: batch1Events,
        prevHash: GENESIS_PREV_HASH,
        hash: hash1,
        clientTStart: 0,
        clientTEnd: 1000,
        serverReceivedAt: new Date("2026-10-01T10:00:01Z"),
        delayed: false,
        clockSuspect: false,
      },
      {
        sessionId: session.id,
        seq: 2,
        events: batch2Events,
        prevHash: hash1,
        hash: hash2,
        clientTStart: 2000,
        clientTEnd: 2000,
        serverReceivedAt: new Date("2026-10-01T10:00:06Z"),
        delayed: false,
        clockSuspect: false,
      },
    ]);

    const before = await loadReceiptBatches(made.pieceId);
    const expected = computeReceipt(before.batches, "hello world");

    const claimedId = await claimGuestPieces({
      token: made.token,
      userId,
    });
    expect(claimedId).toBe(made.pieceId);

    const [piece] = await db
      .select({
        userId: schema.pieces.userId,
        guestId: schema.pieces.guestId,
      })
      .from(schema.pieces)
      .where(eq(schema.pieces.id, made.pieceId))
      .limit(1);
    expect(piece?.userId).toBe(userId);
    expect(piece?.guestId).toBeNull();

    const after = await loadReceiptBatches(made.pieceId);
    expect(after.batches).toHaveLength(2);
    expect(after.chainHeadHash).toBe(before.chainHeadHash);

    const published = await publishPiece({
      pieceId: made.pieceId,
      userId,
      title: "Claimed",
      finalText: "hello world",
      visibility: "private",
    });
    expect(published.ok).toBe(true);
    if (!published.ok) return;

    const [receipt] = await db
      .select({ metrics: schema.receipts.metrics })
      .from(schema.receipts)
      .where(eq(schema.receipts.pieceId, made.pieceId))
      .limit(1);
    expect(receipt?.metrics.activeWritingTimeMs).toBe(
      expected.activeWritingTimeMs,
    );
    expect(receipt?.metrics.sittingRows?.length ?? receipt?.metrics.sessionRows.length).toBe(
      expected.sittingRows?.length ?? expected.sessionRows.length,
    );
  });

  it("deletes only unclaimed guests older than 7 days", async () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const recent = new Date();

    const [oldUnclaimed] = await db
      .insert(schema.guests)
      .values({
        tokenHash: `old-unclaimed-${suffix}`,
        ipHash: "x",
        createdAt: old,
      })
      .returning({ id: schema.guests.id });
    const [oldPiece] = await db
      .insert(schema.pieces)
      .values({ guestId: oldUnclaimed.id, title: "" })
      .returning({ id: schema.pieces.id });

    const [oldClaimed] = await db
      .insert(schema.guests)
      .values({
        tokenHash: `old-claimed-${suffix}`,
        ipHash: "x",
        createdAt: old,
        claimedBy: userId,
        claimedAt: old,
      })
      .returning({ id: schema.guests.id });

    const [recentUnclaimed] = await db
      .insert(schema.guests)
      .values({
        tokenHash: `recent-${suffix}`,
        ipHash: "x",
        createdAt: recent,
      })
      .returning({ id: schema.guests.id });

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    await deleteUnclaimedGuestsOlderThan(cutoff);

    const leftover = await db
      .select({ id: schema.guests.id })
      .from(schema.guests)
      .where(
        and(
          eq(schema.guests.id, oldUnclaimed.id),
        ),
      );
    expect(leftover).toHaveLength(0);

    const gonePiece = await db
      .select({ id: schema.pieces.id })
      .from(schema.pieces)
      .where(eq(schema.pieces.id, oldPiece.id));
    expect(gonePiece).toHaveLength(0);

    const claimedStill = await db
      .select({ id: schema.guests.id })
      .from(schema.guests)
      .where(eq(schema.guests.id, oldClaimed.id));
    expect(claimedStill).toHaveLength(1);

    const recentStill = await db
      .select({ id: schema.guests.id })
      .from(schema.guests)
      .where(eq(schema.guests.id, recentUnclaimed.id));
    expect(recentStill).toHaveLength(1);
  });
});
