export type EventType = "insert" | "delete" | "paste";

export type CharOrigin = "typed" | "pasted" | "quoted";

/** One edit in the event log. `t` is ms since session start. */
export type EditEvent = {
  t: number;
  type: EventType;
  pos: number;
  len: number;
  text: string;
};

/** One stored (or live) batch as input to receipt computation. */
export type ReceiptBatchInput = {
  sessionId: string;
  /** Server time when the writing session started, epoch ms. */
  sessionStartedAt: number;
  /** Server receive time for this batch, epoch ms. */
  serverReceivedAt: number;
  delayed: boolean;
  events: EditEvent[];
};

/** Versioned effort receipt metrics (definitions may change in later versions). */
export type ReceiptMetrics = {
  version: 1;
  /** Sum of inter-event gaps under 60s, across sessions, in ms. */
  activeWritingTimeMs: number;
  /** First session start → last batch serverReceivedAt, in ms. */
  elapsedSpanMs: number;
  /** Sessions that contain at least one event. */
  sessionCount: number;
  /** Final characters tagged typed ÷ final length (0 when empty). */
  typedShare: number;
  /** Final characters tagged pasted ÷ final length (0 when empty). */
  pastedShare: number;
  /** Final characters tagged quoted ÷ final length (0 when empty). */
  quotedShare: number;
  /** Total typed insert characters ÷ final length (0 when empty). */
  revisionRatio: number;
  /** Whitespace-split words in final text, ignoring empties. */
  wordCount: number;
  /** Merged rolling 60s windows of typed input above 150 wpm. */
  fastStretchCount: number;
  /** Runs of 50+ single-char typed inserts with interval CV < 0.15. */
  uniformTypingRunCount: number;
  /** Batches flagged delayed (offline sync). */
  delayedBatchCount: number;
};
