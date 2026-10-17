import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Public pieces must not expose the event log. The old /api/p/[slug]/replay
 * route is gone; nothing under app/api/p may serve batches or events.
 */
describe("published piece event privacy", () => {
  it("does not serve events under /api/p", () => {
    const apiP = path.join(process.cwd(), "app/api/p");
    expect(existsSync(path.join(apiP, "[slug]", "replay"))).toBe(false);

    if (!existsSync(apiP)) {
      return;
    }

    const forbidden = /replay|events|batches|sessions/i;
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        expect(entry.name).not.toMatch(forbidden);
        if (entry.isDirectory()) {
          walk(full);
        }
      }
    };
    walk(apiP);
  });
});
