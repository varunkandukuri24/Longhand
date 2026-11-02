import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/db";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("db pool", () => {
  it("finishes 20 concurrent queries including two transactions", async () => {
    const queries = Array.from({ length: 18 }, (_, i) =>
      db.execute(sql`select ${i}::int as n`),
    );
    const txA = db.transaction(async (tx) => {
      const result = await tx.execute(sql`select 1 as n`);
      expect(result.rows.length).toBeGreaterThan(0);
      return "a";
    });
    const txB = db.transaction(async (tx) => {
      const result = await tx.execute(sql`select 2 as n`);
      expect(result.rows.length).toBeGreaterThan(0);
      return "b";
    });

    const results = await Promise.all([...queries, txA, txB]);
    expect(results).toHaveLength(20);
    expect(results[18]).toBe("a");
    expect(results[19]).toBe("b");
  });
});
