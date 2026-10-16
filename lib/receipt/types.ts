export type EventType = "insert" | "delete" | "paste" | "link";

export type CharOrigin = "typed" | "pasted" | "quoted" | "link";

/** One edit in the event log. `t` is ms since session start. */
export type EditEvent = {
  t: number;
  type: EventType;
  pos: number;
  len: number;
  text: string;
  /** Full URL for `link` events (label is `text`). */
  url?: string;
};

/** A shortened link span in the live or published document. */
export type TextLink = {
  start: number;
  end: number;
  url: string;
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

/** One session or sitting row for the receipt (start, active time, words). */
export type ReceiptSessionRow = {
  /** Wall-clock start, epoch ms. */
  startedAt: number;
  activeWritingTimeMs: number;
  /** Net word-count increase (never negative). */
  wordsAdded: number;
};

/** Versioned effort receipt metrics (definitions may change in later versions). */
export type ReceiptMetrics = {
  version: 1 | 2;
  /** Sum of inter-event gaps under 60s, across sessions, in ms. */
  activeWritingTimeMs: number;
  /** First session start → last batch serverReceivedAt, in ms. */
  elapsedSpanMs: number;
  /** Sessions that contain at least one event (integrity; not the display unit). */
  sessionCount: number;
  /** Final characters tagged typed ÷ counted length (0 when empty). */
  typedShare: number;
  /** Final characters tagged pasted ÷ counted length (0 when empty). */
  pastedShare: number;
  /** Final characters tagged quoted ÷ counted length (0 when empty). */
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
  /** Per-session rows (sessions with ≥1 event); kept for integrity. */
  sessionRows: ReceiptSessionRow[];
  /**
   * Display sittings: sessions less than 30 minutes apart merge.
   * Optional on older stored receipts; fall back to sessionRows.
   */
  sittingRows?: ReceiptSessionRow[];
};
