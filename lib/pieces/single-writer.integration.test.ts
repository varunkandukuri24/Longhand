import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import * as schema from "@/db/schema";
import {
  clientBoundsFromEvents,
  decideBatchAcceptance,
} from "@/lib/receipt/accept-batch";
import { applyEvents } from "@/lib/receipt/apply-events";
import { GENESIS_PREV_HASH, hashBatch } from "@/lib/receipt/hash";
import { sha256HexNode } from "@/lib/receipt/sha256-node";
import type { EditEvent } from "@/lib/receipt/types";

const url = process.env.DATABASE_URL;

/**
 * Two sessions on one piece: the older session's batch is rejected as
 * superseded, and replaying stored batches equals the newer session's text.
 */
describe.skipIf(!url)("single-writer guard", () => {
  const client = postgres(url!, { max: 1 });
  const db = drizzle(client, { schema });
  const userId = `writer-${crypto.randomUUID()}`;
  let pieceId = "";

  beforeAll(async () => {
    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@example.test`,
      name: "Single Writer",
    });
    const [piece] = await db
      .insert(schema.pieces)
      .values({ userId, title: "contested" })
      .returning({ id: schema.pieces.id });
    pieceId = piece.id;
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    await client.end();
  });

  async function claimSession(): Promise<string> {
    const now = new Date();
    return db.transaction(async (tx) => {
      await tx
        .update(schema.sessions)
        .set({ endedAt: now })
        .where(
          and(eq(schema.sessions.pieceId, pieceId), isNull(schema.sessions.endedAt)),
        );

      const [row] = await tx
        .insert(schema.sessions)
        .values({ pieceId, startedAt: now })
        .returning({ id: schema.sessions.id });
      await tx
        .update(schema.pieces)
        .set({ activeSessionId: row.id, updatedAt: now })
        .where(eq(schema.pieces.id, pieceId));
      return row.id;
    });
  }

  async function tryStoreBatch(args: {
    sessionId: string;
    seq: number;
    prevHash: string;
    events: EditEvent[];
  }): Promise<{ status: 200 | 409; reason?: string; stored: boolean }> {
    const hash = await hashBatch(
      args.prevHash,
      args.seq,
      args.events,
      sha256HexNode,
    );
    const bounds = clientBoundsFromEvents(args.events);
    const serverNow = new Date();

    return db.transaction(async (tx) => {
      const [pieceRow] = await tx
        .select({ activeSessionId: schema.pieces.activeSessionId })
        .from(schema.pieces)
        .where(eq(schema.pieces.id, pieceId))
        .limit(1)
        .for("update");

      const [existingSameSeq] = await tx
        .select({ hash: schema.eventBatches.hash })
        .from(schema.eventBatches)
        .where(
          and(
            eq(schema.eventBatches.sessionId, args.sessionId),
            eq(schema.eventBatches.seq, args.seq),
          ),
        )
        .limit(1);

      if (pieceRow?.activeSessionId !== args.sessionId) {
        if (existingSameSeq && existingSameSeq.hash === hash) {
          return { status: 200 as const, stored: false };
        }
        return {
          status: 409 as const,
          reason: "superseded",
          stored: false,
        };
      }

      const [last] = await tx
        .select({
          seq: schema.eventBatches.seq,
          hash: schema.eventBatches.hash,
          serverReceivedAt: schema.eventBatches.serverReceivedAt,
        })
        .from(schema.eventBatches)
        .where(eq(schema.eventBatches.sessionId, args.sessionId))
        .orderBy(desc(schema.eventBatches.seq))
        .limit(1);

      const decision = decideBatchAcceptance({
        incoming: {
          seq: args.seq,
          prevHash: args.prevHash,
          hash,
          events: args.events,
          delayed: false,
          clientTStart: bounds.clientTStart,
          clientTEnd: bounds.clientTEnd,
          recomputedHash: hash,
        },
        last: last ?? null,
        existingSameSeq: existingSameSeq ?? null,
        serverNow,
      });

      if (decision.action === "idempotent") {
        return { status: 200 as const, stored: false };
      }
      if (decision.action === "conflict") {
        return {
          status: 409 as const,
          reason: decision.reason,
          stored: false,
        };
      }

      await tx.insert(schema.eventBatches).values({
        sessionId: args.sessionId,
        seq: args.seq,
        events: args.events,
        prevHash: args.prevHash,
        hash,
        clientTStart: bounds.clientTStart,
        clientTEnd: bounds.clientTEnd,
        serverReceivedAt: serverNow,
        delayed: false,
        clockSuspect: decision.clockSuspect,
      });

      return { status: 200 as const, stored: true };
    });
  }

  it("rejects the older session's batch and rebuilds the newer session's text", async () => {
    const oldSessionId = await claimSession();
    const newSessionId = await claimSession();

    const [piece] = await db
      .select({ activeSessionId: schema.pieces.activeSessionId })
      .from(schema.pieces)
      .where(eq(schema.pieces.id, pieceId));
    expect(piece.activeSessionId).toBe(newSessionId);

    const oldEvents: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 9, text: "from-old" },
    ];
    const stale = await tryStoreBatch({
      sessionId: oldSessionId,
      seq: 1,
      prevHash: GENESIS_PREV_HASH,
      events: oldEvents,
    });
    expect(stale.status).toBe(409);
    expect(stale.reason).toBe("superseded");
    expect(stale.stored).toBe(false);

    const newEvents: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 11, text: "from-newer" },
    ];
    const fresh = await tryStoreBatch({
      sessionId: newSessionId,
      seq: 1,
      prevHash: GENESIS_PREV_HASH,
      events: newEvents,
    });
    expect(fresh.status).toBe(200);
    expect(fresh.stored).toBe(true);

    const rows = await db
      .select({ events: schema.eventBatches.events })
      .from(schema.sessions)
      .innerJoin(
        schema.eventBatches,
        eq(schema.eventBatches.sessionId, schema.sessions.id),
      )
      .where(eq(schema.sessions.pieceId, pieceId))
      .orderBy(asc(schema.sessions.startedAt), asc(schema.eventBatches.seq));

    expect(rows).toHaveLength(1);
    const rebuilt = applyEvents(rows.flatMap((r) => r.events)).text;
    expect(rebuilt).toBe("from-newer");
  });
});
