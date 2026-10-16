import type { ReceiptSessionRow } from "./types";

/** Sessions closer than this merge into one sitting for display. */
export const SITTING_GAP_MS = 30 * 60 * 1000;

/**
 * One session's absolute wall-clock span, used only to group sittings.
 * Sessions with no events must not be passed in.
 */
export type SessionSpan = {
  /** Absolute session start, epoch ms. */
  startedAt: number;
  /** Absolute timestamp of the session's last event, epoch ms. */
  lastEventAt: number;
  activeWritingTimeMs: number;
  wordsAdded: number;
};

/**
 * Group sessions into sittings. Walk in order of absolute start time; if the
 * next session starts less than 30 minutes after the previous one's last event
 * (absolute), it joins the same sitting. Returns each sitting's start time,
 * active minutes and words added. Does not change stored sessions.
 */
export function groupSessionsIntoSittings(
  sessions: readonly SessionSpan[],
): ReceiptSessionRow[] {
  if (sessions.length === 0) {
    return [];
  }

  const sorted = sessions
    .slice()
    .sort((a, b) => a.startedAt - b.startedAt || a.lastEventAt - b.lastEventAt);

  const sittings: ReceiptSessionRow[] = [];
  let startedAt = sorted[0].startedAt;
  let lastEventAt = sorted[0].lastEventAt;
  let activeWritingTimeMs = sorted[0].activeWritingTimeMs;
  let wordsAdded = sorted[0].wordsAdded;

  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i];
    const gap = next.startedAt - lastEventAt;
    if (gap < SITTING_GAP_MS) {
      activeWritingTimeMs += next.activeWritingTimeMs;
      wordsAdded += next.wordsAdded;
      lastEventAt = Math.max(lastEventAt, next.lastEventAt);
    } else {
      sittings.push({ startedAt, activeWritingTimeMs, wordsAdded });
      startedAt = next.startedAt;
      lastEventAt = next.lastEventAt;
      activeWritingTimeMs = next.activeWritingTimeMs;
      wordsAdded = next.wordsAdded;
    }
  }

  sittings.push({ startedAt, activeWritingTimeMs, wordsAdded });
  return sittings;
}
