import { describe, expect, it } from "vitest";
import {
  clientBoundsFromEvents,
  clientTimestampsIncreasing,
  decideBatchAcceptance,
  evaluateClockSuspect,
} from "./accept-batch";
import { GENESIS_PREV_HASH, hashBatch } from "./hash";
import { sha256HexNode } from "./sha256-node";
import type { EditEvent } from "./types";

const events: EditEvent[] = [
  { t: 0, type: "insert", pos: 0, len: 5, text: "Hello" },
];

async function hashed(seq: number, prevHash: string, evs = events) {
  const hash = await hashBatch(prevHash, seq, evs, sha256HexNode);
  const bounds = clientBoundsFromEvents(evs);
  return {
    seq,
    prevHash,
    hash,
    events: evs,
    delayed: false,
    ...bounds,
    recomputedHash: hash,
  };
}

describe("decideBatchAcceptance", () => {
  it("accepts the first batch of a session", async () => {
    const incoming = await hashed(1, GENESIS_PREV_HASH);
    const decision = decideBatchAcceptance({
      incoming,
      last: null,
      existingSameSeq: null,
      serverNow: new Date("2026-01-01T00:00:05Z"),
    });
    expect(decision).toEqual({ action: "accept", clockSuspect: false });
  });

  it("returns 409 conflict decision on seq gap", async () => {
    const firstHash = await hashBatch(
      GENESIS_PREV_HASH,
      1,
      events,
      sha256HexNode,
    );
    const incoming = await hashed(3, firstHash);
    const decision = decideBatchAcceptance({
      incoming,
      last: {
        seq: 1,
        hash: firstHash,
        serverReceivedAt: new Date("2026-01-01T00:00:00Z"),
      },
      existingSameSeq: null,
      serverNow: new Date("2026-01-01T00:00:05Z"),
    });
    expect(decision).toEqual({ action: "conflict", reason: "gap" });
  });

  it("returns conflict when the batch hash was tampered", async () => {
    const incoming = await hashed(1, GENESIS_PREV_HASH);
    const decision = decideBatchAcceptance({
      incoming: {
        ...incoming,
        hash: "a".repeat(64),
        recomputedHash: incoming.recomputedHash,
      },
      last: null,
      existingSameSeq: null,
      serverNow: new Date("2026-01-01T00:00:05Z"),
    });
    expect(decision).toEqual({ action: "conflict", reason: "hash_mismatch" });
  });

  it("returns conflict when prevHash breaks the chain", async () => {
    const firstHash = await hashBatch(
      GENESIS_PREV_HASH,
      1,
      events,
      sha256HexNode,
    );
    const incoming = await hashed(2, "b".repeat(64));
    const decision = decideBatchAcceptance({
      incoming,
      last: {
        seq: 1,
        hash: firstHash,
        serverReceivedAt: new Date("2026-01-01T00:00:00Z"),
      },
      existingSameSeq: null,
      serverNow: new Date("2026-01-01T00:00:05Z"),
    });
    expect(decision).toEqual({ action: "conflict", reason: "broken_chain" });
  });

  it("treats identical seq+hash retry as idempotent", async () => {
    const incoming = await hashed(1, GENESIS_PREV_HASH);
    const decision = decideBatchAcceptance({
      incoming,
      last: {
        seq: 1,
        hash: incoming.hash,
        serverReceivedAt: new Date("2026-01-01T00:00:00Z"),
      },
      existingSameSeq: { hash: incoming.hash },
      serverNow: new Date("2026-01-01T00:00:05Z"),
    });
    expect(decision).toEqual({ action: "idempotent" });
  });

  it("conflicts when same seq has a different hash", async () => {
    const incoming = await hashed(1, GENESIS_PREV_HASH);
    const decision = decideBatchAcceptance({
      incoming,
      last: {
        seq: 1,
        hash: "c".repeat(64),
        serverReceivedAt: new Date("2026-01-01T00:00:00Z"),
      },
      existingSameSeq: { hash: "c".repeat(64) },
      serverNow: new Date("2026-01-01T00:00:05Z"),
    });
    expect(decision).toEqual({ action: "conflict", reason: "hash_mismatch" });
  });
});

describe("clock sanity", () => {
  it("detects non-increasing client timestamps", () => {
    expect(
      clientTimestampsIncreasing([
        { t: 10, type: "insert", pos: 0, len: 1, text: "a" },
        { t: 5, type: "insert", pos: 1, len: 1, text: "b" },
      ]),
    ).toBe(false);
  });

  it("flags span mismatch over 20% and skips delayed/first", () => {
    const last = new Date("2026-01-01T00:00:00Z");
    const now = new Date("2026-01-01T00:00:10Z"); // 10s server gap
    expect(
      evaluateClockSuspect({
        events: [{ t: 0, type: "insert", pos: 0, len: 1, text: "a" }],
        clientTStart: 0,
        clientTEnd: 1000, // 1s batch span vs 10s gap
        delayed: false,
        isFirstBatch: false,
        lastServerReceivedAt: last,
        serverNow: now,
      }),
    ).toBe(true);

    expect(
      evaluateClockSuspect({
        events: [{ t: 0, type: "insert", pos: 0, len: 1, text: "a" }],
        clientTStart: 0,
        clientTEnd: 1000,
        delayed: true,
        isFirstBatch: false,
        lastServerReceivedAt: last,
        serverNow: now,
      }),
    ).toBe(false);

    expect(
      evaluateClockSuspect({
        events: [{ t: 0, type: "insert", pos: 0, len: 1, text: "a" }],
        clientTStart: 0,
        clientTEnd: 1000,
        delayed: false,
        isFirstBatch: true,
        lastServerReceivedAt: null,
        serverNow: now,
      }),
    ).toBe(false);
  });
});
