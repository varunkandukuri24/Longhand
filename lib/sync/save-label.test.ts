import { describe, expect, it } from "vitest";
import { saveLabelFor } from "./save-label";
import type { SyncStatus } from "./types";

function status(partial: Partial<SyncStatus>): SyncStatus {
  return {
    queuedCount: 0,
    lastAckSeq: null,
    lastSessionId: null,
    delayedQueued: 0,
    clockSuspectCount: 0,
    lastDelayed: false,
    lastClockSuspect: false,
    online: true,
    superseded: false,
    discardedBatches: 0,
    refused: false,
    ...partial,
  };
}

describe("saveLabelFor", () => {
  it("shows not saved after a forced 4xx refusal", () => {
    expect(saveLabelFor(status({ refused: true, queuedCount: 1 }))).toBe(
      "not saved",
    );
  });

  it("shows saving only while queued without a refusal", () => {
    expect(saveLabelFor(status({ queuedCount: 2 }))).toBe("saving");
  });

  it("shows nothing until a batch has been accepted", () => {
    expect(saveLabelFor(null)).toBe("");
    expect(saveLabelFor(status({ queuedCount: 0, lastAckSeq: null }))).toBe("");
  });

  it("shows saved after the first accepted batch", () => {
    expect(saveLabelFor(status({ queuedCount: 0, lastAckSeq: 1 }))).toBe(
      "saved",
    );
  });
});
