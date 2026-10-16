export { applyEvents, isQuoteLineAt } from "./apply-events";
export type { ApplyResult } from "./apply-events";
export { isEditEvent } from "./edit-event";
export {
  GENESIS_PREV_HASH,
  batchHashInput,
  canonicalizeEvent,
  hashBatch,
} from "./hash";
export type { CanonicalEvent } from "./hash";
export {
  clientBoundsFromEvents,
  decideBatchAcceptance,
  evaluateClockSuspect,
} from "./accept-batch";
export {
  RECEIPT_VERSION,
  computeReceipt,
  computeSessionRows,
  computeSittings,
  liveBatchesFromEvents,
} from "./compute-receipt";
export {
  formatCompositionLegend,
  formatDuration,
  formatReceiptDate,
  formatReceiptNotes,
  formatRevisionLine,
  formatSignatureMeta,
  formatSignatureSentence,
  formatSittingCount,
  formatSittingDateRange,
  formatSittingRowWhen,
  formatVerifiedCopy,
  sharesToPercents,
  shortenHash,
} from "./format";
export type { CompositionLegendPart, SharePercents } from "./format";
export { groupSessionsIntoSittings, SITTING_GAP_MS } from "./sittings";
export type { SessionSpan } from "./sittings";
export { makePieceSlug, randomSlugSuffix } from "./slug";
export {
  COMPRESSED_IDLE_MS,
  REPLAY_IDLE_GAP_MS,
  REPLAY_SNAPSHOT_EVERY,
  buildReplayTimeline,
  eventIndexAtPlaybackTime,
  replayMatchesPublished,
  textAtEventIndex,
} from "./replay-timeline";
export type { ReplaySnapshot, ReplayTimeline } from "./replay-timeline";
export type {
  CharOrigin,
  EditEvent,
  EventType,
  ReceiptBatchInput,
  ReceiptMetrics,
  ReceiptSessionRow,
  TextLink,
} from "./types";
export {
  shortenRemainingUrls,
  urlBeforeWhitespace,
  urlsFollowedByWhitespaceInRange,
} from "./shorten";
