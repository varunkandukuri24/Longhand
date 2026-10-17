import { db } from "@/db";
import { eventBatches, sessions } from "@/db/schema";
import { applyEvents } from "@/lib/receipt/apply-events";
import { priorActiveWritingMs } from "@/lib/receipt/writing-time";
import type { CharOrigin, EditEvent, TextLink } from "@/lib/receipt/types";
import { asc, eq } from "drizzle-orm";
import { getTableColumns } from "drizzle-orm";

export type PieceState = {
  text: string;
  origins: CharOrigin[];
  links: TextLink[];
  events: EditEvent[];
  /** Active writing ms from stored batches (receipt definition), before this sitting. */
  priorActiveMs: number;
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
  const sessionEventLists: EditEvent[][] = [];
  let currentSessionId: string | null = null;
  let currentSessionEvents: EditEvent[] = [];
  let delayedCount = 0;
  let clockSuspectCount = 0;
  let lastAckSeq: number | null = null;
  let lastSessionId: string | null = null;

  for (const row of rows) {
    if (currentSessionId !== null && row.sessionId !== currentSessionId) {
      sessionEventLists.push(currentSessionEvents);
      currentSessionEvents = [];
    }
    currentSessionId = row.sessionId;
    const batchEvents = row.events ?? [];
    currentSessionEvents.push(...batchEvents);
    events.push(...batchEvents);
    if (row.delayed) delayedCount += 1;
    if (row.clockSuspect) clockSuspectCount += 1;
    lastAckSeq = row.seq;
    lastSessionId = row.sessionId;
  }
  if (currentSessionId !== null) {
    sessionEventLists.push(currentSessionEvents);
  }

  const { text, origins, links } = applyEvents(events);
  const priorActiveMs = priorActiveWritingMs(sessionEventLists);

  return {
    text,
    origins,
    links,
    events,
    priorActiveMs,
    lastAckSeq,
    lastSessionId,
    flags: {
      delayedCount,
      clockSuspectCount,
    },
  };
}
