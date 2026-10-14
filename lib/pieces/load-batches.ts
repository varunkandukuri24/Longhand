import { db } from "@/db";
import { eventBatches, sessions } from "@/db/schema";
import type { ReceiptBatchInput } from "@/lib/receipt/types";
import { asc, eq } from "drizzle-orm";

/**
 * Load every stored batch for a piece as receipt inputs, ordered by session
 * start then seq. Also returns the chain head hash (last batch hash) or "".
 */
export async function loadReceiptBatches(pieceId: string): Promise<{
  batches: ReceiptBatchInput[];
  chainHeadHash: string;
}> {
  const rows = await db
    .select({
      sessionId: sessions.id,
      sessionStartedAt: sessions.startedAt,
      events: eventBatches.events,
      hash: eventBatches.hash,
      delayed: eventBatches.delayed,
      serverReceivedAt: eventBatches.serverReceivedAt,
      seq: eventBatches.seq,
    })
    .from(sessions)
    .innerJoin(eventBatches, eq(eventBatches.sessionId, sessions.id))
    .where(eq(sessions.pieceId, pieceId))
    .orderBy(asc(sessions.startedAt), asc(eventBatches.seq));

  const batches: ReceiptBatchInput[] = rows.map((row) => ({
    sessionId: row.sessionId,
    sessionStartedAt: row.sessionStartedAt.getTime(),
    serverReceivedAt: row.serverReceivedAt.getTime(),
    delayed: row.delayed,
    events: row.events ?? [],
  }));

  const chainHeadHash = rows.length > 0 ? rows[rows.length - 1]!.hash : "";

  return { batches, chainHeadHash };
}
