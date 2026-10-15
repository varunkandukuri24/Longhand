import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("public page never contains location", () => {
  const files = [
    "app/p/[slug]/page.tsx",
    "app/p/layout.tsx",
    "app/p/[slug]/opengraph-image.tsx",
    "components/receipt/LibraryCard.tsx",
  ];

  it("does not reference city or coordinates on public surfaces", () => {
    for (const file of files) {
      const src = read(file);
      expect(src, file).not.toMatch(/\bcityName\b|\bcity_name\b/);
      expect(src, file).not.toMatch(/\blatitude\b|\blongitude\b/);
      expect(src, file).not.toMatch(/geolocation|navigator\.geolocation/i);
    }
  });
});
