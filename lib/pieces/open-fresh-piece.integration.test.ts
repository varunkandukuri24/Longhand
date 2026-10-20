import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { openFreshPiece } from "./open-fresh-piece";
import { eq } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("openFreshPiece", () => {
  const userId = `fresh-${crypto.randomUUID()}`;

  beforeAll(async () => {
    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@example.test`,
      name: "Fresh Writer",
      handle: `f${userId.replace(/[^a-z0-9]/g, "").slice(-10)}`,
    });
  });

  afterAll(async () => {
    await db.delete(schema.pieces).where(eq(schema.pieces.userId, userId));
    await db.delete(schema.users).where(eq(schema.users.id, userId));
  });

  it("reuses the empty draft on a second call", async () => {
    const first = await openFreshPiece(userId);
    const second = await openFreshPiece(userId);
    expect(second).toBe(first);

    const drafts = await db
      .select({ id: schema.pieces.id })
      .from(schema.pieces)
      .where(eq(schema.pieces.userId, userId));
    expect(drafts).toHaveLength(1);
  });
});
