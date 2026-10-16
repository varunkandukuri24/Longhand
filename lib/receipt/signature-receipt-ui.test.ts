import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("signature receipt public copy", () => {
  const publicFiles = [
    "components/receipt/SignatureReceipt.tsx",
    "components/receipt/Seal.tsx",
    "app/p/[slug]/page.tsx",
    "app/p/[slug]/opengraph-image.tsx",
    "lib/receipt/format.ts",
  ];

  it("never says pasted or AI on public surfaces", () => {
    for (const file of publicFiles) {
      const src = read(file);
      expect(src, file).not.toMatch(/\bpasted\b/i);
      expect(src, file).not.toMatch(/\bAI\b/);
    }
  });

  it("only renders hashes inside the fingerprints toggle", () => {
    const src = read("components/receipt/SignatureReceipt.tsx");
    const toggle = src.indexOf("fingerprintsOpen ?");
    expect(toggle).toBeGreaterThan(-1);
    const before = src.slice(0, toggle);
    const after = src.slice(toggle);
    // Full hash values are only interpolated in the open fingerprints panel.
    expect(before).not.toMatch(/\{finalTextHash\}/);
    expect(before).not.toMatch(/\{chainHeadHash\}/);
    expect(after).toMatch(/\{finalTextHash\}/);
    expect(after).toMatch(/\{chainHeadHash\}/);
  });

  it("does not include the library card, stamp, verify line or replay", () => {
    const page = read("app/p/[slug]/page.tsx");
    const receipt = read("components/receipt/SignatureReceipt.tsx");
    expect(page).not.toMatch(/LibraryCard|VerifyLine|ReplayPlayer|replayPublic/);
    expect(page).toMatch(/SignatureReceipt/);
    expect(receipt).toMatch(/Verified · See how it was written/);
    expect(receipt).not.toMatch(/Watch it being written/);
  });

  it("puts Verified first in the details and uses the exact seal paths", () => {
    const receipt = read("components/receipt/SignatureReceipt.tsx");
    const verified = receipt.indexOf("Verified");
    const sittings = receipt.indexOf("Sittings");
    expect(verified).toBeGreaterThan(-1);
    expect(sittings).toBeGreaterThan(verified);

    const seal = read("components/receipt/Seal.tsx");
    expect(seal).toContain(
      'd="M15.5 26.5c2.2-0.4 4.2-2.2 5.6-4.6 1.2-2 2.2-4.6 4.4-6 1.6-1 3.1-0.6 3 0.9-0.2 2.2-3.4 4-6 5.2"',
    );
  });
});
