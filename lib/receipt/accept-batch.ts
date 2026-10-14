import type { EditEvent } from "./types";

export type StoredBatchHead = {
  seq: number;
  hash: string;
  serverReceivedAt: Date;
};

export type IncomingBatch = {
  seq: number;
  prevHash: string;
  hash: string;
  events: readonly EditEvent[];
  delayed: boolean;
  clientTStart: number;
  clientTEnd: number;
  /** Server-computed hash of the incoming payload; must equal `hash`. */
  recomputedHash: string;
};

export type ConflictReason =
  | "gap"
  | "broken_chain"
  | "hash_mismatch"
  | "superseded";

export type AcceptBatchDecision =
  | { action: "idempotent" }
  | { action: "accept"; clockSuspect: boolean }
  | { action: "conflict"; reason: ConflictReason };

const GENESIS = "0".repeat(64);
const CLOCK_SLACK = 0.2;

/** Whether client event timestamps within the batch are non-decreasing. */
export function clientTimestampsIncreasing(
  events: readonly EditEvent[],
): boolean {
  for (let i = 1; i < events.length; i += 1) {
    if (events[i].t < events[i - 1].t) {
      return false;
    }
  }
  return true;
}

/**
 * Flag clock_suspect when timestamps decrease, or when the batch span
 * differs from the server gap since the last batch by more than 20%.
 * Skips the span check for the first batch and delayed batches.
 */
export function evaluateClockSuspect(args: {
  events: readonly EditEvent[];
  clientTStart: number;
  clientTEnd: number;
  delayed: boolean;
  isFirstBatch: boolean;
  lastServerReceivedAt: Date | null;
  serverNow: Date;
}): boolean {
  if (!clientTimestampsIncreasing(args.events)) {
    return true;
  }

  if (args.isFirstBatch || args.delayed || args.lastServerReceivedAt === null) {
    return false;
  }

  const batchSpanMs = Math.max(0, args.clientTEnd - args.clientTStart);
  const serverGapMs = Math.max(
    0,
    args.serverNow.getTime() - args.lastServerReceivedAt.getTime(),
  );

  if (serverGapMs === 0) {
    return batchSpanMs > 0;
  }

  const ratio = Math.abs(batchSpanMs - serverGapMs) / serverGapMs;
  return ratio > CLOCK_SLACK;
}

/**
 * Decide whether to store a batch. Pure; does not touch the database.
 * Call only after ownership checks. `existingSameSeq` is the row with this seq, if any.
 */
export function decideBatchAcceptance(args: {
  incoming: IncomingBatch;
  last: StoredBatchHead | null;
  existingSameSeq: { hash: string } | null;
  serverNow: Date;
}): AcceptBatchDecision {
  const { incoming, last, existingSameSeq, serverNow } = args;

  if (existingSameSeq) {
    if (existingSameSeq.hash === incoming.hash) {
      return { action: "idempotent" };
    }
    return { action: "conflict", reason: "hash_mismatch" };
  }

  const expectedSeq = last === null ? 1 : last.seq + 1;
  if (incoming.seq !== expectedSeq) {
    return { action: "conflict", reason: "gap" };
  }

  const expectedPrev = last === null ? GENESIS : last.hash;
  if (incoming.prevHash !== expectedPrev) {
    return { action: "conflict", reason: "broken_chain" };
  }

  if (incoming.hash !== incoming.recomputedHash) {
    return { action: "conflict", reason: "hash_mismatch" };
  }

  const clockSuspect = evaluateClockSuspect({
    events: incoming.events,
    clientTStart: incoming.clientTStart,
    clientTEnd: incoming.clientTEnd,
    delayed: incoming.delayed,
    isFirstBatch: last === null,
    lastServerReceivedAt: last?.serverReceivedAt ?? null,
    serverNow,
  });

  return { action: "accept", clockSuspect };
}

export function clientBoundsFromEvents(events: readonly EditEvent[]): {
  clientTStart: number;
  clientTEnd: number;
} {
  if (events.length === 0) {
    return { clientTStart: 0, clientTEnd: 0 };
  }
  let min = events[0].t;
  let max = events[0].t;
  for (const event of events) {
    if (event.t < min) min = event.t;
    if (event.t > max) max = event.t;
  }
  return { clientTStart: min, clientTEnd: max };
}
