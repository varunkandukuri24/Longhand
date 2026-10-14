import { describe, expect, it } from "vitest";
import {
  GENESIS_PREV_HASH,
  batchHashInput,
  canonicalizeEvent,
  hashBatch,
} from "./hash";
import { sha256HexNode } from "./sha256-node";
import { sha256HexWeb } from "./sha256-web";
import type { EditEvent } from "./types";

/** Fixed vectors — both node:crypto and Web Crypto must match these. */
const VECTOR_EVENTS: EditEvent[] = [
  { t: 0, type: "insert", pos: 0, len: 5, text: "Hello" },
  { t: 40, type: "insert", pos: 5, len: 1, text: " " },
  { t: 80, type: "paste", pos: 6, len: 5, text: "world" },
];

const VECTOR_SEQ = 1;
const VECTOR_PREV = GENESIS_PREV_HASH;

const VECTOR_INPUT =
  "0000000000000000000000000000000000000000000000000000000000000000|1|" +
  JSON.stringify([
    { t: 0, type: "insert", pos: 0, len: 5, text: "Hello" },
    { t: 40, type: "insert", pos: 5, len: 1, text: " " },
    { t: 80, type: "paste", pos: 6, len: 5, text: "world" },
  ]);

/** Precomputed SHA-256 hex of VECTOR_INPUT (node:crypto and Web Crypto). */
export const VECTOR_HASH =
  "55b670da58e304cbd8d89cda477cb550fc821af185941f18612cbc435f8e7e21";

describe("hashBatch", () => {
  it("builds the canonical input with fixed key order", () => {
    const scrambled: EditEvent = {
      text: "x",
      len: 1,
      pos: 0,
      type: "insert",
      t: 10,
    };
    expect(canonicalizeEvent(scrambled)).toEqual({
      t: 10,
      type: "insert",
      pos: 0,
      len: 1,
      text: "x",
    });
    expect(batchHashInput(VECTOR_PREV, VECTOR_SEQ, VECTOR_EVENTS)).toBe(
      VECTOR_INPUT,
    );
  });

  it("matches fixed vectors on node:crypto and Web Crypto", async () => {
    const nodeHash = await hashBatch(
      VECTOR_PREV,
      VECTOR_SEQ,
      VECTOR_EVENTS,
      sha256HexNode,
    );
    const webHash = await hashBatch(
      VECTOR_PREV,
      VECTOR_SEQ,
      VECTOR_EVENTS,
      sha256HexWeb,
    );

    expect(nodeHash).toBe(VECTOR_HASH);
    expect(webHash).toBe(VECTOR_HASH);
    expect(nodeHash).toBe(webHash);
  });

  it("chains the second batch off the first hash", async () => {
    const first = await hashBatch(
      GENESIS_PREV_HASH,
      1,
      VECTOR_EVENTS,
      sha256HexNode,
    );
    const secondEvents: EditEvent[] = [
      { t: 120, type: "insert", pos: 11, len: 1, text: "!" },
    ];
    const second = await hashBatch(first, 2, secondEvents, sha256HexNode);
    const secondWeb = await hashBatch(first, 2, secondEvents, sha256HexWeb);
    expect(second).toBe(secondWeb);
    expect(second).not.toBe(first);
  });
});
