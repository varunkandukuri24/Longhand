import { describe, expect, it } from "vitest";
import { applyEvents } from "./apply-events";
import {
  buildReplayTimeline,
  COMPRESSED_IDLE_MS,
  eventIndexAtPlaybackTime,
  REPLAY_IDLE_GAP_MS,
  replayMatchesPublished,
  textAtEventIndex,
} from "./replay-timeline";
import type { EditEvent } from "./types";

describe("buildReplayTimeline", () => {
  it("compresses idle gaps over 5 seconds to 1 second", () => {
    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 1, text: "a" },
      { t: REPLAY_IDLE_GAP_MS + 1, type: "insert", pos: 1, len: 1, text: "b" },
    ];
    const timeline = buildReplayTimeline(events);
    expect(timeline.playbackTimes).toEqual([0, COMPRESSED_IDLE_MS]);
  });

  it("preserves short gaps", () => {
    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 1, text: "a" },
      { t: 400, type: "insert", pos: 1, len: 1, text: "b" },
    ];
    const timeline = buildReplayTimeline(events);
    expect(timeline.playbackTimes).toEqual([0, 400]);
  });

  it("precomputes snapshots every 200 events", () => {
    const events: EditEvent[] = [];
    for (let i = 0; i < 401; i += 1) {
      events.push({
        t: i * 10,
        type: "insert",
        pos: i,
        len: 1,
        text: "x",
      });
    }
    const timeline = buildReplayTimeline(events);
    expect(timeline.snapshots.map((s) => s.eventIndex)).toEqual([
      0, 200, 400,
    ]);
    expect(timeline.snapshots[1]!.text).toBe("x".repeat(200));
  });
});

describe("replayMatchesPublished", () => {
  it("final replay frame equals the published text", () => {
    const events: EditEvent[] = [
      { t: 0, type: "insert", pos: 0, len: 5, text: "hello" },
      { t: 50, type: "insert", pos: 5, len: 1, text: "!" },
    ];
    const published = applyEvents(events).text;
    const { matches, text } = replayMatchesPublished(events, published);
    expect(matches).toBe(true);
    expect(text).toBe(published);

    const timeline = buildReplayTimeline(events);
    expect(textAtEventIndex(timeline, events.length)).toBe(published);
    expect(eventIndexAtPlaybackTime(timeline, timeline.durationMs)).toBe(
      events.length,
    );
  });
});
