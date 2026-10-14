import { applyEvents } from "./apply-events";
import type { EditEvent } from "./types";

/** Idle gaps longer than this compress to COMPRESSED_IDLE_MS. */
export const REPLAY_IDLE_GAP_MS = 5_000;
export const COMPRESSED_IDLE_MS = 1_000;
export const REPLAY_SNAPSHOT_EVERY = 200;

export type ReplaySnapshot = {
  /** Inclusive end index into events (0 = empty doc before any event). */
  eventIndex: number;
  text: string;
};

export type ReplayTimeline = {
  events: EditEvent[];
  /** Playback clock ms for each event (same length as events). */
  playbackTimes: number[];
  /** Total compressed duration in ms. */
  durationMs: number;
  snapshots: ReplaySnapshot[];
};

/**
 * Build a compressed playback timeline from session-flattened events.
 * Within each session, idle gaps over 5s become 1s. Session boundaries
 * (when `t` resets) insert a 1s pause.
 */
export function buildReplayTimeline(
  events: readonly EditEvent[],
): ReplayTimeline {
  if (events.length === 0) {
    return {
      events: [],
      playbackTimes: [],
      durationMs: 0,
      snapshots: [{ eventIndex: 0, text: "" }],
    };
  }

  const playbackTimes: number[] = [];
  let clock = 0;
  let prevSessionT: number | null = null;

  for (let i = 0; i < events.length; i += 1) {
    const event = events[i]!;
    if (prevSessionT === null) {
      clock = 0;
    } else if (event.t < prevSessionT) {
      clock += COMPRESSED_IDLE_MS;
    } else {
      const gap = event.t - prevSessionT;
      if (gap > REPLAY_IDLE_GAP_MS) {
        clock += COMPRESSED_IDLE_MS;
      } else if (gap > 0) {
        clock += gap;
      }
    }
    playbackTimes.push(clock);
    prevSessionT = event.t;
  }

  const snapshots: ReplaySnapshot[] = [{ eventIndex: 0, text: "" }];
  for (
    let i = REPLAY_SNAPSHOT_EVERY;
    i <= events.length;
    i += REPLAY_SNAPSHOT_EVERY
  ) {
    snapshots.push({
      eventIndex: i,
      text: applyEvents(events.slice(0, i)).text,
    });
  }

  return {
    events: events.slice(),
    playbackTimes,
    durationMs: playbackTimes[playbackTimes.length - 1] ?? 0,
    snapshots,
  };
}

/**
 * Text after applying `eventCount` events. Uses the nearest prior snapshot
 * so scrubbing never replays more than REPLAY_SNAPSHOT_EVERY events.
 */
export function textAtEventIndex(
  timeline: ReplayTimeline,
  eventCount: number,
): string {
  const n = Math.max(0, Math.min(eventCount, timeline.events.length));
  if (n === 0) {
    return "";
  }

  let snapIndex = 0;
  for (let i = 0; i < timeline.snapshots.length; i += 1) {
    if (timeline.snapshots[i]!.eventIndex <= n) {
      snapIndex = i;
    } else {
      break;
    }
  }

  const snap = timeline.snapshots[snapIndex]!;
  if (snap.eventIndex === n) {
    return snap.text;
  }

  return applyEventsOntoText(
    snap.text,
    timeline.events.slice(snap.eventIndex, n),
  );
}

/** Apply events onto an existing text string (text-only; no origin tags). */
function applyEventsOntoText(
  startText: string,
  events: readonly EditEvent[],
): string {
  let text = startText;
  for (const event of events) {
    if (event.type === "delete") {
      text = text.slice(0, event.pos) + text.slice(event.pos + event.len);
      continue;
    }
    text = text.slice(0, event.pos) + event.text + text.slice(event.pos);
  }
  return text;
}

/**
 * Largest event count whose playback time is ≤ playbackMs
 * (0 = before the first event).
 */
export function eventIndexAtPlaybackTime(
  timeline: ReplayTimeline,
  playbackMs: number,
): number {
  if (timeline.playbackTimes.length === 0) {
    return 0;
  }
  let lo = 0;
  let hi = timeline.playbackTimes.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (timeline.playbackTimes[mid]! <= playbackMs) {
      lo = mid + 1;
    } else {
      hi = mid;
    }
  }
  return lo;
}

/** Rebuild full text and whether it matches the published final text. */
export function replayMatchesPublished(
  events: readonly EditEvent[],
  publishedText: string,
): { text: string; matches: boolean } {
  const text = applyEvents(events).text;
  return { text, matches: text === publishedText };
}
