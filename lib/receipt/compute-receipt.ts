import { findLinks } from "@/lib/references";
import { applyEvents } from "./apply-events";
import { groupSessionsIntoSittings, type SessionSpan } from "./sittings";
import type {
  EditEvent,
  ReceiptBatchInput,
  ReceiptMetrics,
  ReceiptSessionRow,
} from "./types";

export const RECEIPT_VERSION = 2 as const;

/** Gaps at or above this are idle, not active writing. */
export const ACTIVE_GAP_MAX_MS = 60_000;

/** Rolling window length for the fast-stretch speed check. */
export const FAST_STRETCH_WINDOW_MS = 60_000;

/** Characters per "word" for WPM timing flags. */
export const CHARS_PER_WORD = 5;

/** Sustained typed speed that marks a fast stretch (words per minute). */
export const FAST_STRETCH_WPM = 150;

/** Minimum single-char typed inserts in a uniform-typing run. */
export const UNIFORM_RUN_MIN_LENGTH = 50;

/** Inter-keystroke CV below this counts as unnaturally uniform. */
export const UNIFORM_CV_MAX = 0.15;

const FAST_STRETCH_CHARS =
  (FAST_STRETCH_WPM * CHARS_PER_WORD * FAST_STRETCH_WINDOW_MS) / 60_000;

function eventsForSession(
  batches: readonly ReceiptBatchInput[],
  sessionId: string,
): EditEvent[] {
  const events: EditEvent[] = [];
  for (const batch of batches) {
    if (batch.sessionId === sessionId) {
      events.push(...batch.events);
    }
  }
  return events;
}

/** Session ids that have at least one event, in first-seen order. */
export function sessionsWithEvents(
  batches: readonly ReceiptBatchInput[],
): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const batch of batches) {
    if (batch.events.length === 0 || seen.has(batch.sessionId)) {
      continue;
    }
    seen.add(batch.sessionId);
    ordered.push(batch.sessionId);
  }
  return ordered;
}

/**
 * Within one session, sum gaps between consecutive event `t` values,
 * counting only gaps strictly under 60 seconds.
 */
export function activeWritingTimeMsForEvents(
  events: readonly EditEvent[],
): number {
  if (events.length < 2) {
    return 0;
  }
  let total = 0;
  for (let i = 1; i < events.length; i += 1) {
    const gap = events[i].t - events[i - 1].t;
    if (gap > 0 && gap < ACTIVE_GAP_MAX_MS) {
      total += gap;
    }
  }
  return total;
}

export function activeWritingTimeMs(
  batches: readonly ReceiptBatchInput[],
): number {
  let total = 0;
  for (const sessionId of sessionsWithEvents(batches)) {
    total += activeWritingTimeMsForEvents(eventsForSession(batches, sessionId));
  }
  return total;
}

/**
 * Elapsed span from the earliest session start among sessions with events
 * to the latest batch serverReceivedAt (server clocks only).
 */
export function elapsedSpanMs(batches: readonly ReceiptBatchInput[]): number {
  const activeIds = new Set(sessionsWithEvents(batches));
  if (activeIds.size === 0) {
    return 0;
  }

  let firstStart = Number.POSITIVE_INFINITY;
  let lastReceived = Number.NEGATIVE_INFINITY;

  for (const batch of batches) {
    if (!activeIds.has(batch.sessionId)) {
      continue;
    }
    if (batch.sessionStartedAt < firstStart) {
      firstStart = batch.sessionStartedAt;
    }
    if (batch.serverReceivedAt > lastReceived) {
      lastReceived = batch.serverReceivedAt;
    }
  }

  if (
    !Number.isFinite(firstStart) ||
    !Number.isFinite(lastReceived) ||
    lastReceived < firstStart
  ) {
    return 0;
  }
  return lastReceived - firstStart;
}

export function delayedBatchCount(
  batches: readonly ReceiptBatchInput[],
): number {
  let count = 0;
  for (const batch of batches) {
    if (batch.delayed) {
      count += 1;
    }
  }
  return count;
}

export function wordCount(text: string): number {
  if (text.length === 0) {
    return 0;
  }
  let count = 0;
  for (const part of text.split(/\s+/)) {
    if (part.length > 0) {
      count += 1;
    }
  }
  return count;
}

/** Total characters inserted by typed (`insert`) events across the log. */
export function typedInsertChars(events: readonly EditEvent[]): number {
  let total = 0;
  for (const event of events) {
    if (event.type === "insert") {
      total += event.text.length;
    }
  }
  return total;
}

export type OriginShares = {
  typedShare: number;
  pastedShare: number;
  quotedShare: number;
};

/**
 * Shares of final text by origin. Characters inside a link's range are
 * left out of all three counts and the denominator.
 */
export function originShares(
  origins: readonly string[],
  finalText: string,
): OriginShares {
  if (finalText.length <= 0 || origins.length === 0) {
    return { typedShare: 0, pastedShare: 0, quotedShare: 0 };
  }

  const excluded = new Uint8Array(finalText.length);
  for (const link of findLinks(finalText)) {
    for (let i = link.start; i < link.end && i < excluded.length; i += 1) {
      excluded[i] = 1;
    }
  }

  let typed = 0;
  let pasted = 0;
  let quoted = 0;
  let counted = 0;
  const n = Math.min(origins.length, finalText.length);
  for (let i = 0; i < n; i += 1) {
    const origin = origins[i];
    // Shortened labels (origin link) and raw URL ranges are left out.
    if (origin === "link" || excluded[i]) continue;
    counted += 1;
    if (origin === "typed") typed += 1;
    else if (origin === "pasted") pasted += 1;
    else if (origin === "quoted") quoted += 1;
  }
  if (counted <= 0) {
    return { typedShare: 0, pastedShare: 0, quotedShare: 0 };
  }
  return {
    typedShare: typed / counted,
    pastedShare: pasted / counted,
    quotedShare: quoted / counted,
  };
}

function mean(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }
  let sum = 0;
  for (const v of values) {
    sum += v;
  }
  return sum / values.length;
}

function sampleStdDev(values: readonly number[], avg: number): number {
  if (values.length < 2) {
    return 0;
  }
  let sumSq = 0;
  for (const v of values) {
    const d = v - avg;
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / (values.length - 1));
}

/** Coefficient of variation (sample stddev / mean); 0 when mean is 0. */
export function coefficientOfVariation(values: readonly number[]): number {
  const avg = mean(values);
  if (avg === 0) {
    return 0;
  }
  return sampleStdDev(values, avg) / avg;
}

/**
 * Count runs of 50+ consecutive single-character typed inserts whose
 * inter-keystroke intervals have CV below 0.15.
 */
export function uniformTypingRunCount(
  events: readonly EditEvent[],
): number {
  let runs = 0;
  let runStart = -1;

  const flush = (endExclusive: number) => {
    if (runStart < 0) {
      return;
    }
    const length = endExclusive - runStart;
    if (length < UNIFORM_RUN_MIN_LENGTH) {
      runStart = -1;
      return;
    }
    const intervals: number[] = [];
    for (let i = runStart + 1; i < endExclusive; i += 1) {
      intervals.push(events[i].t - events[i - 1].t);
    }
    if (
      intervals.length >= UNIFORM_RUN_MIN_LENGTH - 1 &&
      coefficientOfVariation(intervals) < UNIFORM_CV_MAX
    ) {
      runs += 1;
    }
    runStart = -1;
  };

  for (let i = 0; i < events.length; i += 1) {
    const event = events[i];
    const isSingleTyped =
      event.type === "insert" && event.text.length === 1;
    if (isSingleTyped) {
      if (runStart < 0) {
        runStart = i;
      }
    } else {
      flush(i);
    }
  }
  flush(events.length);
  return runs;
}

type Interval = { start: number; end: number };

function mergeIntervals(intervals: Interval[]): Interval[] {
  if (intervals.length === 0) {
    return [];
  }
  const sorted = intervals.slice().sort((a, b) => a.start - b.start);
  const merged: Interval[] = [{ ...sorted[0] }];
  for (let i = 1; i < sorted.length; i += 1) {
    const cur = sorted[i];
    const last = merged[merged.length - 1];
    if (cur.start <= last.end) {
      last.end = Math.max(last.end, cur.end);
    } else {
      merged.push({ ...cur });
    }
  }
  return merged;
}

/**
 * Typed-insert events only, in order. Used for rolling-window WPM checks
 * within one session (session-relative `t`).
 */
export function fastStretchCountForEvents(
  events: readonly EditEvent[],
): number {
  const typed: { t: number; chars: number }[] = [];
  for (const event of events) {
    if (event.type === "insert" && event.text.length > 0) {
      typed.push({ t: event.t, chars: event.text.length });
    }
  }
  if (typed.length === 0) {
    return 0;
  }

  const windows: Interval[] = [];
  let j = 0;
  let charSum = 0;

  for (let i = 0; i < typed.length; i += 1) {
    const windowEnd = typed[i].t;
    const windowStart = windowEnd - FAST_STRETCH_WINDOW_MS;
    charSum += typed[i].chars;
    while (j <= i && typed[j].t <= windowStart) {
      charSum -= typed[j].chars;
      j += 1;
    }
    // Window is (windowStart, windowEnd]; chars whose t is in (windowStart, windowEnd].
    if (charSum > FAST_STRETCH_CHARS) {
      windows.push({
        start: Math.max(0, windowStart),
        end: windowEnd,
      });
    }
  }

  return mergeIntervals(windows).length;
}

export function fastStretchCount(
  batches: readonly ReceiptBatchInput[],
): number {
  let total = 0;
  for (const sessionId of sessionsWithEvents(batches)) {
    total += fastStretchCountForEvents(eventsForSession(batches, sessionId));
  }
  return total;
}

export function uniformTypingRunCountForBatches(
  batches: readonly ReceiptBatchInput[],
): number {
  let total = 0;
  for (const sessionId of sessionsWithEvents(batches)) {
    total += uniformTypingRunCount(eventsForSession(batches, sessionId));
  }
  return total;
}

/** Flatten batch events in caller order (chronological storage order). */
function allEvents(batches: readonly ReceiptBatchInput[]): EditEvent[] {
  const events: EditEvent[] = [];
  for (const batch of batches) {
    events.push(...batch.events);
  }
  return events;
}

/**
 * Split a flat event list into sessions wherever `t` goes backwards
 * (session-relative clocks restart). Used for live debug receipts.
 */
export function partitionEventsBySessionClock(
  events: readonly EditEvent[],
): EditEvent[][] {
  const parts: EditEvent[][] = [];
  let current: EditEvent[] = [];
  for (const event of events) {
    if (current.length > 0 && event.t < current[current.length - 1].t) {
      parts.push(current);
      current = [];
    }
    current.push(event);
  }
  if (current.length > 0) {
    parts.push(current);
  }
  return parts;
}

/**
 * Build receipt batch inputs from a flat live event log (t resets per session)
 * plus wall-clock anchors for the current session.
 */
export function liveBatchesFromEvents(
  events: readonly EditEvent[],
  opts: {
    sessionStartedAt: number;
    now: number;
    delayedBatchCount?: number;
    daySpacingMs?: number;
  },
): ReceiptBatchInput[] {
  const parts = partitionEventsBySessionClock(events);
  if (parts.length === 0) {
    return [];
  }

  const daySpacing = opts.daySpacingMs ?? 86_400_000;
  let delayedLeft = opts.delayedBatchCount ?? 0;

  return parts.map((partEvents, i) => {
    const isLast = i === parts.length - 1;
    const sessionStartedAt = isLast
      ? opts.sessionStartedAt
      : opts.sessionStartedAt - (parts.length - 1 - i) * daySpacing;
    const maxT = partEvents.reduce((m, e) => Math.max(m, e.t), 0);
    const delayed = delayedLeft > 0;
    if (delayed) {
      delayedLeft -= 1;
    }
    return {
      sessionId: `live-${i}`,
      sessionStartedAt,
      serverReceivedAt: isLast ? opts.now : sessionStartedAt + maxT,
      delayed,
      events: partEvents,
    };
  });
}

/**
 * Per-session active time and net words added, in first-seen session order.
 * Words added is max(0, wordCount after − wordCount before).
 */
export function computeSessionRows(
  batches: readonly ReceiptBatchInput[],
): ReceiptSessionRow[] {
  return sessionSpansFromBatches(batches).map((span) => ({
    startedAt: span.startedAt,
    activeWritingTimeMs: span.activeWritingTimeMs,
    wordsAdded: span.wordsAdded,
  }));
}

function sessionSpansFromBatches(
  batches: readonly ReceiptBatchInput[],
): SessionSpan[] {
  const spans: SessionSpan[] = [];
  let prefixEvents: EditEvent[] = [];

  for (const sessionId of sessionsWithEvents(batches)) {
    const sessionEvents = eventsForSession(batches, sessionId);
    if (sessionEvents.length === 0) {
      continue;
    }
    const beforeWords = wordCount(applyEvents(prefixEvents).text);
    prefixEvents = [...prefixEvents, ...sessionEvents];
    const afterWords = wordCount(applyEvents(prefixEvents).text);

    let sessionStartedAt = Number.POSITIVE_INFINITY;
    for (const batch of batches) {
      if (batch.sessionId === sessionId && batch.sessionStartedAt < sessionStartedAt) {
        sessionStartedAt = batch.sessionStartedAt;
      }
    }
    if (!Number.isFinite(sessionStartedAt)) {
      sessionStartedAt = 0;
    }

    let maxT = Number.NEGATIVE_INFINITY;
    for (const event of sessionEvents) {
      if (event.t > maxT) maxT = event.t;
    }
    if (!Number.isFinite(maxT)) {
      maxT = 0;
    }

    spans.push({
      startedAt: sessionStartedAt,
      lastEventAt: sessionStartedAt + maxT,
      activeWritingTimeMs: activeWritingTimeMsForEvents(sessionEvents),
      wordsAdded: Math.max(0, afterWords - beforeWords),
    });
  }

  return spans;
}

/**
 * Group sessions into sittings for display. Raw sessions stay unchanged.
 */
export function computeSittings(
  batches: readonly ReceiptBatchInput[],
): ReceiptSessionRow[] {
  return groupSessionsIntoSittings(sessionSpansFromBatches(batches));
}

/** Compute versioned effort receipt metrics from stored/live batches. */
export function computeReceipt(
  batches: readonly ReceiptBatchInput[],
  finalText: string,
): ReceiptMetrics {
  const events = allEvents(batches);
  const { origins } = applyEvents(events);
  const length = finalText.length;
  const shares = originShares(origins, finalText);
  const typedChars = typedInsertChars(events);
  const revisionRatio = length > 0 ? typedChars / length : 0;

  const sessionRows = computeSessionRows(batches);
  return {
    version: RECEIPT_VERSION,
    activeWritingTimeMs: activeWritingTimeMs(batches),
    elapsedSpanMs: elapsedSpanMs(batches),
    sessionCount: sessionsWithEvents(batches).length,
    typedShare: shares.typedShare,
    pastedShare: shares.pastedShare,
    quotedShare: shares.quotedShare,
    revisionRatio,
    wordCount: wordCount(finalText),
    fastStretchCount: fastStretchCount(batches),
    uniformTypingRunCount: uniformTypingRunCountForBatches(batches),
    delayedBatchCount: delayedBatchCount(batches),
    sessionRows,
    sittingRows: computeSittings(batches),
  };
}
