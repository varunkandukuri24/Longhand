import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SignatureReceipt } from "@/components/receipt/SignatureReceipt";
import type { ReceiptMetrics } from "@/lib/receipt/types";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

/** Distinctive stored hashes a signed-out reader must never see. */
const FINAL_TEXT_HASH =
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const CHAIN_HEAD_HASH =
  "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

const metrics: ReceiptMetrics = {
  version: 1,
  activeWritingTimeMs: 52 * 60_000,
  elapsedSpanMs: 52 * 60_000,
  sessionCount: 1,
  typedShare: 1,
  pastedShare: 0,
  quotedShare: 0,
  revisionRatio: 1.2,
  wordCount: 40,
  fastStretchCount: 0,
  uniformTypingRunCount: 0,
  delayedBatchCount: 0,
  sessionRows: [
    {
      startedAt: Date.parse("2024-10-11T12:00:00Z"),
      activeWritingTimeMs: 52 * 60_000,
      wordsAdded: 40,
    },
  ],
  sittingRows: [
    {
      startedAt: Date.parse("2024-10-11T12:00:00Z"),
      activeWritingTimeMs: 52 * 60_000,
      wordsAdded: 40,
    },
  ],
};

const publicSurfaces = [
  "components/receipt/SignatureReceipt.tsx",
  "components/pieces/PublishedPieceView.tsx",
  "app/p/[slug]/page.tsx",
  "app/p/[slug]/opengraph-image.tsx",
  "app/u/[handle]/page.tsx",
  "app/u/[handle]/opengraph-image.tsx",
  "app/u/[handle]/[slug]/page.tsx",
  "app/u/[handle]/[slug]/opengraph-image.tsx",
];

describe("public pages hide stored fingerprints", () => {
  it("rendered piece receipt for a signed-out reader has no stored hashes", () => {
    const html = renderToStaticMarkup(
      <SignatureReceipt
        author="Sam"
        publishedAt={new Date("2024-10-11T12:00:00Z")}
        metrics={metrics}
      />,
    );

    expect(html).not.toContain(FINAL_TEXT_HASH);
    expect(html).not.toContain(CHAIN_HEAD_HASH);
    expect(html).not.toMatch(/fingerprint/i);
    expect(html).not.toContain("Technical fingerprints");
    expect(html).not.toContain("Writing log");
  });

  it("share-image and piece-page modules never put hashes in the UI", () => {
    for (const file of publicSurfaces) {
      const src = read(file);
      expect(src, file).not.toMatch(/finalTextHash=\{/);
      expect(src, file).not.toMatch(/chainHeadHash=\{/);
      expect(src, file).not.toMatch(/\{finalTextHash\}/);
      expect(src, file).not.toMatch(/\{chainHeadHash\}/);
      expect(src, file).not.toMatch(/final_text_hash|chain_head_hash/);
      expect(src, file).not.toMatch(/Technical fingerprints/);
      expect(src, file).not.toContain(FINAL_TEXT_HASH);
      expect(src, file).not.toContain(CHAIN_HEAD_HASH);
    }

    // Share images only load title / author / metrics — never hash columns.
    const pieceOg = read("app/p/[slug]/opengraph-image.tsx");
    const writerPieceOg = read("app/u/[handle]/[slug]/opengraph-image.tsx");
    const writerOg = read("app/u/[handle]/opengraph-image.tsx");
    for (const src of [pieceOg, writerPieceOg, writerOg]) {
      expect(src).not.toMatch(/finalTextHash|chainHeadHash|hash/i);
    }
  });
});
