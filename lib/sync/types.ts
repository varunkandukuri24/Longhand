import type { EditEvent } from "@/lib/receipt/types";

export type QueuedBatch = {
  /** Local queue id (stable for IndexedDB). */
  id: string;
  pieceId: string;
  sessionId: string;
  seq: number;
  events: EditEvent[];
  prevHash: string;
  hash: string;
  clientTStart: number;
  clientTEnd: number;
  /** Wall-clock ms when the batch was first queued. */
  createdAt: number;
  delayed: boolean;
};

export type SyncStatus = {
  queuedCount: number;
  lastAckSeq: number | null;
  lastSessionId: string | null;
  delayedQueued: number;
  clockSuspectCount: number;
  lastDelayed: boolean;
  lastClockSuspect: boolean;
  online: boolean;
  superseded: boolean;
  discardedBatches: number;
};
