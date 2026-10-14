import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import * as schema from "@/db/schema";
import {
  clientBoundsFromEvents,
  decideBatchAcceptance,
} from "./accept-batch";
import { applyEvents } from "./apply-events";
import { GENESIS_PREV_HASH, hashBatch } from "./hash";
import { sha256HexNode } from "./sha256-node";
import type { EditEvent } from "./types";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("batch store integration", () => {
  const client = postgres(url!, { max: 1 });
  const db = drizzle(client, { schema });
  const userId = `test-user-${crypto.randomUUID()}`;
  let pieceId = "";
  let sessionId = "";

  beforeAll(async () => {
    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@example.test`,
      name: "Phase 2 Tester",
    });
    const [piece] = await db
      .insert(schema.pieces)
      .values({ userId, title: "integration" })
      .returning({ id: schema.pieces.id });
    pieceId = piece.id;
    const [session] = await db
      .insert(schema.sessions)
      .values({ pieceId })
      .returning({ id: schema.sessions.id });
    sessionId = session.id;
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    await client.end();
  });

  async function acceptAndStore(args: {
    seq: number;
    prevHash: string;
    events: EditEvent[];
    hashOverride?: string;
    delayed?: boolean;
  }) {
    const hash =
      args.hashOverride ??
      (await hashBatch(args.prevHash, args.seq, args.events, sha256HexNode));
    const recomputedHash = await hashBatch(
      args.prevHash,
      args.seq,
      args.events,
      sha256HexNode,
    );
    const bounds = clientBoundsFromEvents(args.events);
    const serverNow = new Date();

    return db.transaction(async (tx) => {
      const [existingSameSeq] = await tx
        .select({ hash: schema.eventBatches.hash })
        .from(schema.eventBatches)
        .where(
          and(
            eq(schema.eventBatches.sessionId, sessionId),
            eq(schema.eventBatches.seq, args.seq),
          ),
        )
        .limit(1);

      const [last] = await tx
        .select({
          seq: schema.eventBatches.seq,
          hash: schema.eventBatches.hash,
          serverReceivedAt: schema.eventBatches.serverReceivedAt,
        })
        .from(schema.eventBatches)
        .where(eq(schema.eventBatches.sessionId, sessionId))
        .orderBy(desc(schema.eventBatches.seq))
        .limit(1);

      const decision = decideBatchAcceptance({
        incoming: {
          seq: args.seq,
          prevHash: args.prevHash,
          hash,
          events: args.events,
          delayed: args.delayed ?? false,
          clientTStart: bounds.clientTStart,
          clientTEnd: bounds.clientTEnd,
          recomputedHash,
        },
        last: last ?? null,
        existingSameSeq: existingSameSeq ?? null,
        serverNow,
      });

      if (decision.action === "idempotent") {
        return { status: 200 as const, stored: false, decision };
      }
      if (decision.action === "conflict") {
        return { status: 409 as const, stored: false, decision };
      }

      await tx.insert(schema.eventBatches).values({
        sessionId,
        seq: args.seq,
        events: args.events,
        prevHash: args.prevHash,
        hash,
        clientTStart: bounds.clientTStart,
        clientTEnd: bounds.clientTEnd,
        serverReceivedAt: serverNow,
        delayed: args.delayed ?? false,
        clockSuspect: decision.clockSuspect,
      });
      return { status: 200 as const, stored: true, decision };
    });
  }

  it("stores a batch, rejects tamper/gap with 409, idempotent retry stores nothing", async () => {
    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 3, text: "hey" },
    ];

    const first = await acceptAndStore({
      seq: 1,
      prevHash: GENESIS_PREV_HASH,
      events,
    });
    expect(first.status).toBe(200);
    expect(first.stored).toBe(true);

    const countAfterFirst = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.eventBatches)
      .where(eq(schema.eventBatches.sessionId, sessionId));
    expect(countAfterFirst[0].n).toBe(1);

    const firstHash = await hashBatch(
      GENESIS_PREV_HASH,
      1,
      events,
      sha256HexNode,
    );

    const gap = await acceptAndStore({
      seq: 3,
      prevHash: firstHash,
      events: [{ t: 10, type: "insert", pos: 3, len: 1, text: "!" }],
    });
    expect(gap.status).toBe(409);

    const tampered = await acceptAndStore({
      seq: 2,
      prevHash: firstHash,
      events: [{ t: 10, type: "insert", pos: 3, len: 1, text: "!" }],
      hashOverride: createHash("sha256").update("tamper").digest("hex"),
    });
    expect(tampered.status).toBe(409);

    const retry = await acceptAndStore({
      seq: 1,
      prevHash: GENESIS_PREV_HASH,
      events,
    });
    expect(retry.status).toBe(200);
    expect(retry.stored).toBe(false);

    const countAfterRetry = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.eventBatches)
      .where(eq(schema.eventBatches.sessionId, sessionId));
    expect(countAfterRetry[0].n).toBe(1);

    const more: EditEvent[] = [
      { t: 50, type: "insert", pos: 3, len: 6, text: " there" },
    ];
    const second = await acceptAndStore({
      seq: 2,
      prevHash: firstHash,
      events: more,
    });
    expect(second.status).toBe(200);
    expect(second.stored).toBe(true);

    const rows = await db
      .select({ events: schema.eventBatches.events })
      .from(schema.eventBatches)
      .where(eq(schema.eventBatches.sessionId, sessionId))
      .orderBy(asc(schema.eventBatches.seq));

    const rebuilt = applyEvents(rows.flatMap((r) => r.events)).text;
    expect(rebuilt).toBe("hey there");
    expect(pieceId).toBeTruthy();
  });
});
