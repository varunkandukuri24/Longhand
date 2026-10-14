import { db } from "@/db";
import { eventBatches, sessions } from "@/db/schema";
import { applyEvents } from "@/lib/receipt/apply-events";
import type { CharOrigin, EditEvent } from "@/lib/receipt/types";
import { asc, eq } from "drizzle-orm";
import { getTableColumns } from "drizzle-orm";

export type PieceState = {
  text: string;
  origins: CharOrigin[];
  events: EditEvent[];
  lastAckSeq: number | null;
  lastSessionId: string | null;
  flags: {
    delayedCount: number;
    clockSuspectCount: number;
  };
};

/**
 * Rebuild text and origins by replaying every stored batch in order.
 * A piece with zero batches returns empty text and empty origins.
 */
export async function loadPieceState(pieceId: string): Promise<PieceState> {
  // Guard against a stale schema module missing columns (seen under Turbopack HMR).
  const columns = getTableColumns(eventBatches);
  if (!columns.clockSuspect) {
    throw new Error(
      "event_batches.clock_suspect column missing from schema module; restart the dev server",
    );
  }

  const rows = await db
    .select({
      sessionId: sessions.id,
      seq: eventBatches.seq,
      events: eventBatches.events,
      delayed: eventBatches.delayed,
      clockSuspect: columns.clockSuspect,
      hash: eventBatches.hash,
    })
    .from(sessions)
    .innerJoin(eventBatches, eq(eventBatches.sessionId, sessions.id))
    .where(eq(sessions.pieceId, pieceId))
    .orderBy(asc(sessions.startedAt), asc(eventBatches.seq));

  const events: EditEvent[] = [];
  let delayedCount = 0;
  let clockSuspectCount = 0;
  let lastAckSeq: number | null = null;
  let lastSessionId: string | null = null;

  for (const row of rows) {
    events.push(...(row.events ?? []));
    if (row.delayed) delayedCount += 1;
    if (row.clockSuspect) clockSuspectCount += 1;
    lastAckSeq = row.seq;
    lastSessionId = row.sessionId;
  }

  const { text, origins } = applyEvents(events);

  return {
    text,
    origins,
    events,
    lastAckSeq,
    lastSessionId,
    flags: {
      delayedCount,
      clockSuspectCount,
    },
  };
}
