import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "../..");

const SCAN_DIRS = ["app", "components", "lib", "db"];

function walkTsFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = statSync(path);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walkTsFiles(path, out);
    } else if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts")) {
      out.push(path);
    }
  }
  return out;
}

describe("links in a piece never trigger outbound HTTP", () => {
  it("has no URL-fetching source module", () => {
    expect(existsSync(join(ROOT, "lib/source"))).toBe(false);
  });

  it("has no code path that fetches a link from a piece", () => {
    const forbidden = [
      /fetchSourceMeta/,
      /createResponsePiece/,
      /parseSourceMeta/,
      /SOURCE_FETCH_/,
      /from\s+["']@\/lib\/source/,
    ];
    for (const dir of SCAN_DIRS) {
      for (const file of walkTsFiles(join(ROOT, dir))) {
        const src = readFileSync(file, "utf8");
        for (const pattern of forbidden) {
          expect(src, file).not.toMatch(pattern);
        }
      }
    }
  });
});
