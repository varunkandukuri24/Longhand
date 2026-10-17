export { applyEvents, isQuoteLineAt } from "./apply-events";
export type { ApplyResult } from "./apply-events";
export {
  applyEventsStrict,
  assertHttpUrl,
  InvalidEventError,
  MAX_BATCH_BODY_BYTES,
  MAX_EVENTS_PER_BATCH,
  MAX_INSERT_CHARS,
  MAX_LINK_URL_CHARS,
  rebuildTextFromEvents,
} from "./apply-events-strict";
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
export {
  formatWritingClock,
  liveSittingActiveMs,
  priorActiveWritingMs,
  priorActiveWritingMsFromBatches,
} from "./writing-time";
