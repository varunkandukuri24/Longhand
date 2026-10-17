import { eventBatches, sessions } from "@/db/schema";
import { rebuildTextFromEvents } from "@/lib/receipt/apply-events-strict";
import type { EditEvent } from "@/lib/receipt/types";
import { asc, eq } from "drizzle-orm";

/** Rebuild piece text from all stored batches (session order, then seq). */
export async function rebuildDraftTextFromBatches(
  // Drizzle transaction client (same query API as `db`).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: { select: (...args: any[]) => any },
  pieceId: string,
): Promise<string> {
  const rows = await tx
    .select({
      events: eventBatches.events,
    })
    .from(sessions)
    .innerJoin(eventBatches, eq(eventBatches.sessionId, sessions.id))
    .where(eq(sessions.pieceId, pieceId))
    .orderBy(asc(sessions.startedAt), asc(eventBatches.seq));

  const events: EditEvent[] = [];
  for (const row of rows) {
    events.push(...(row.events ?? []));
  }
  return rebuildTextFromEvents(events);
}
