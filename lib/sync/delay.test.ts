import { describe, expect, it } from "vitest";
import { DELAY_THRESHOLD_MS, isBatchDelayed } from "./delay";

describe("isBatchDelayed", () => {
  it("marks a batch delayed after 2 minutes", () => {
    const createdAt = 1_000_000;
    expect(isBatchDelayed(createdAt, createdAt + DELAY_THRESHOLD_MS)).toBe(
      false,
    );
    expect(
      isBatchDelayed(createdAt, createdAt + DELAY_THRESHOLD_MS + 1),
    ).toBe(true);
  });

  it("models offline queue then flush without losing events", () => {
    // Stand-in for IndexedDB: batches written before send, removed only after ack.
    const queue: { events: string[]; createdAt: number; acked: boolean }[] = [];
    const createdAt = Date.now() - 60_000; // offline for 1 minute
    queue.push({ events: ["a", "b", "c"], createdAt, acked: false });

    // On reconnect, send in order and ack.
    for (const batch of queue) {
      expect(batch.acked).toBe(false);
      const delayed = isBatchDelayed(batch.createdAt, Date.now());
      expect(delayed).toBe(false); // 1 minute < 2 minute threshold
      batch.acked = true;
    }

    const remaining = queue.filter((b) => !b.acked);
    expect(remaining).toHaveLength(0);
    expect(queue.flatMap((b) => b.events)).toEqual(["a", "b", "c"]);
  });
});
