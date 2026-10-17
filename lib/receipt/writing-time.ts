import {
  ACTIVE_GAP_MAX_MS,
  activeWritingTimeMs,
  activeWritingTimeMsForEvents,
} from "./compute-receipt";
import type { EditEvent, ReceiptBatchInput } from "./types";

/**
 * Prior active writing time for a piece from stored session event lists.
 * Same definition as the receipt: sum of inter-event gaps under 60 s, per session.
 */
export function priorActiveWritingMs(
  sessionEvents: readonly (readonly EditEvent[])[],
): number {
  let total = 0;
  for (const events of sessionEvents) {
    total += activeWritingTimeMsForEvents(events);
  }
  return total;
}

/** Same as {@link priorActiveWritingMs} from receipt batch inputs. */
export function priorActiveWritingMsFromBatches(
  batches: readonly ReceiptBatchInput[],
): number {
  return activeWritingTimeMs(batches);
}

/**
 * Active ms for the current sitting so far, including a live trailing gap
 * while the writer is still within the 60 s idle threshold.
 */
export function liveSittingActiveMs(args: {
  events: readonly EditEvent[];
  /** Wall-clock ms of the last local edit in this sitting, or null. */
  lastEventWallMs: number | null;
  nowWallMs: number;
}): number {
  const completed = activeWritingTimeMsForEvents(args.events);
  if (args.lastEventWallMs === null || args.events.length === 0) {
    return completed;
  }
  const trailing = args.nowWallMs - args.lastEventWallMs;
  if (trailing > 0 && trailing < ACTIVE_GAP_MAX_MS) {
    return completed + trailing;
  }
  return completed;
}

/** Format for the bar clock: `m:ss` under an hour, `h:mm:ss` from an hour. */
export function formatWritingClock(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  const ss = seconds.toString().padStart(2, "0");
  if (hours >= 1) {
    const mm = minutes.toString().padStart(2, "0");
    return `${hours}:${mm}:${ss}`;
  }
  return `${minutes}:${ss}`;
}
