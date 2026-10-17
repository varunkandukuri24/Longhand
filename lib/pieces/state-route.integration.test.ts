import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { GENESIS_PREV_HASH, hashBatch } from "@/lib/receipt/hash";
import { sha256HexNode } from "@/lib/receipt/sha256-node";
import type { EditEvent } from "@/lib/receipt/types";
import { getTableColumns } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL;

const authMock = vi.hoisted(() => ({
  userId: "" as string,
}));

vi.mock("@/auth", () => ({
  auth: async () =>
    authMock.userId
      ? { user: { id: authMock.userId, email: "route@test" } }
      : null,
}));

describe.skipIf(!databaseUrl)("GET /api/pieces/[id]/state (real route)", () => {
  let client: ReturnType<typeof postgres>;
  let db: ReturnType<typeof drizzle>;
  const userId = `state-route-${crypto.randomUUID()}`;
  let emptyPieceId = "";
  let withBatchesPieceId = "";
  let GET: typeof import("@/app/api/pieces/[id]/state/route").GET;

  beforeAll(async () => {
    client = postgres(databaseUrl!, { max: 1 });
    db = drizzle(client, { schema });
    // Schema module must expose clock_suspect (the live bug was this missing).
    expect(getTableColumns(schema.eventBatches).clockSuspect).toBeDefined();

    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@example.test`,
      name: "State Route Tester",
      handle: `state-${userId.slice(-12)}`.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 30),
    });
    authMock.userId = userId;

    const [emptyPiece] = await db
      .insert(schema.pieces)
      .values({ userId, title: "empty" })
      .returning({ id: schema.pieces.id });
    emptyPieceId = emptyPiece.id;

    const [batchPiece] = await db
      .insert(schema.pieces)
      .values({ userId, title: "with batches" })
      .returning({ id: schema.pieces.id });
    withBatchesPieceId = batchPiece.id;

    const [writingSession] = await db
      .insert(schema.sessions)
      .values({ pieceId: withBatchesPieceId })
      .returning({ id: schema.sessions.id });

    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 5, text: "hello" },
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

    ({ GET } = await import("@/app/api/pieces/[id]/state/route"));
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    await client.end();
  });

  it("returns 200 with empty text/origins for a new piece with zero batches", async () => {
    const res = await GET(new Request("http://localhost/api/state"), {
      params: Promise.resolve({ id: emptyPieceId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      text: string;
      origins: unknown[];
      events: unknown[];
    };
    expect(body.text).toBe("");
    expect(body.origins).toEqual([]);
    expect(body.events).toEqual([]);
  });

  it("returns 200 and rebuilt text for a piece with stored batches", async () => {
    const res = await GET(new Request("http://localhost/api/state"), {
      params: Promise.resolve({ id: withBatchesPieceId }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      text: string;
      origins: string[];
      events: EditEvent[];
      lastAckSeq: number;
    };
    expect(body.text).toBe("hello");
    expect(body.origins).toEqual([
      "typed",
      "typed",
      "typed",
      "typed",
      "typed",
    ]);
    expect(body.events).toHaveLength(1);
    expect(body.lastAckSeq).toBe(1);
  });

  it("returns 401 when not signed in", async () => {
    authMock.userId = "";
    const res = await GET(new Request("http://localhost/api/state"), {
      params: Promise.resolve({ id: emptyPieceId }),
    });
    expect(res.status).toBe(401);
    authMock.userId = userId;
  });
});
