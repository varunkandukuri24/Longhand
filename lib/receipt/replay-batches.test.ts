import { describe, expect, it } from "vitest";
import { applyEvents } from "./apply-events";
import { GENESIS_PREV_HASH, hashBatch } from "./hash";
import { sha256HexNode } from "./sha256-node";
import type { EditEvent } from "./types";

type StoredBatch = {
  seq: number;
  prevHash: string;
  hash: string;
  events: EditEvent[];
};

/** Simulate storing batches then replaying them like GET /state. */
async function storeAndReplay(eventGroups: EditEvent[][]): Promise<{
  batches: StoredBatch[];
  text: string;
}> {
  const batches: StoredBatch[] = [];
  let prevHash = GENESIS_PREV_HASH;
  let seq = 0;

  for (const events of eventGroups) {
    seq += 1;
    const hash = await hashBatch(prevHash, seq, events, sha256HexNode);
    batches.push({ seq, prevHash, hash, events });
    prevHash = hash;
  }

  const all = batches.flatMap((b) => b.events);
  return { batches, text: applyEvents(all).text };
}

describe("replaying stored batches", () => {
  it("rebuilds the exact text from hash-chained batches", async () => {
    const groups: EditEvent[][] = [
      [
        { t: 0, type: "insert", pos: 0, len: 5, text: "Hello" },
        { t: 40, type: "insert", pos: 5, len: 1, text: " " },
      ],
      [{ t: 80, type: "paste", pos: 6, len: 5, text: "world" }],
      [
        { t: 120, type: "insert", pos: 11, len: 1, text: "." },
        { t: 200, type: "delete", pos: 5, len: 1, text: " " },
        { t: 200, type: "insert", pos: 5, len: 1, text: "," },
      ],
    ];

    const { batches, text } = await storeAndReplay(groups);
    expect(batches).toHaveLength(3);
    expect(batches[0].prevHash).toBe(GENESIS_PREV_HASH);
    expect(batches[1].prevHash).toBe(batches[0].hash);
    expect(batches[2].prevHash).toBe(batches[1].hash);
    expect(text).toBe("Hello,world.");
  });
});
