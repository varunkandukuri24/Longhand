import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL;

describe.skipIf(!databaseUrl)("GET /api/cron/cleanup", () => {
  const secret = `cron-test-${crypto.randomUUID()}`;
  const suffix = crypto.randomUUID().slice(0, 8);
  const prevSecret = process.env.CRON_SECRET;
  let GET: typeof import("./route").GET;

  beforeAll(async () => {
    process.env.CRON_SECRET = secret;
    ({ GET } = await import("./route"));
  });

  afterAll(() => {
    if (prevSecret === undefined) {
      delete process.env.CRON_SECRET;
    } else {
      process.env.CRON_SECRET = prevSecret;
    }
  });

  it("returns 401 without the secret", async () => {
    const res = await GET(new Request("http://localhost/api/cron/cleanup"));
    expect(res.status).toBe(401);
  });

  it("returns 401 with the wrong bearer token", async () => {
    const res = await GET(
      new Request("http://localhost/api/cron/cleanup", {
        headers: { authorization: "Bearer wrong" },
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    try {
      const res = await GET(
        new Request("http://localhost/api/cron/cleanup", {
          headers: { authorization: `Bearer ${secret}` },
        }),
      );
      expect(res.status).toBe(401);
    } finally {
      process.env.CRON_SECRET = secret;
    }
  });

  it("deletes unclaimed guests older than 7 days and hits older than 24 hours", async () => {
    const old = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const recent = new Date();
    const oldHit = new Date(Date.now() - 25 * 60 * 60 * 1000);

    const [oldGuest] = await db
      .insert(schema.guests)
      .values({
        tokenHash: `cron-old-${suffix}`,
        ipHash: "x",
        createdAt: old,
      })
      .returning({ id: schema.guests.id });

    const [oldPiece] = await db
      .insert(schema.pieces)
      .values({ guestId: oldGuest.id, title: "" })
      .returning({ id: schema.pieces.id });

    const [recentGuest] = await db
      .insert(schema.guests)
      .values({
        tokenHash: `cron-recent-${suffix}`,
        ipHash: "x",
        createdAt: recent,
      })
      .returning({ id: schema.guests.id });

    const [staleHit] = await db
      .insert(schema.rateLimitHits)
      .values({
        bucket: "cron-test",
        keyHash: `cron-old-${suffix}`,
        createdAt: oldHit,
      })
      .returning({ id: schema.rateLimitHits.id });

    const [freshHit] = await db
      .insert(schema.rateLimitHits)
      .values({
        bucket: "cron-test",
        keyHash: `cron-new-${suffix}`,
        createdAt: recent,
      })
      .returning({ id: schema.rateLimitHits.id });

    const res = await GET(
      new Request("http://localhost/api/cron/cleanup", {
        headers: { authorization: `Bearer ${secret}` },
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      guestsDeleted: number;
      hitsDeleted: number;
    };
    expect(body.ok).toBe(true);
    expect(body.guestsDeleted).toBeGreaterThanOrEqual(1);
    expect(body.hitsDeleted).toBeGreaterThanOrEqual(1);

    expect(oldGuest).toBeDefined();
    expect(oldPiece).toBeDefined();
    expect(recentGuest).toBeDefined();
    expect(staleHit).toBeDefined();
    expect(freshHit).toBeDefined();

    const leftoverGuest = await db
      .select({ id: schema.guests.id })
      .from(schema.guests)
      .where(eq(schema.guests.id, oldGuest!.id));
    expect(leftoverGuest).toHaveLength(0);

    const leftoverPiece = await db
      .select({ id: schema.pieces.id })
      .from(schema.pieces)
      .where(eq(schema.pieces.id, oldPiece!.id));
    expect(leftoverPiece).toHaveLength(0);

    const leftoverHit = await db
      .select({ id: schema.rateLimitHits.id })
      .from(schema.rateLimitHits)
      .where(eq(schema.rateLimitHits.id, staleHit!.id));
    expect(leftoverHit).toHaveLength(0);

    const recentStill = await db
      .select({ id: schema.guests.id })
      .from(schema.guests)
      .where(eq(schema.guests.id, recentGuest!.id));
    expect(recentStill).toHaveLength(1);

    const freshStill = await db
      .select({ id: schema.rateLimitHits.id })
      .from(schema.rateLimitHits)
      .where(eq(schema.rateLimitHits.id, freshHit!.id));
    expect(freshStill).toHaveLength(1);

    await db.delete(schema.guests).where(eq(schema.guests.id, recentGuest!.id));
    await db
      .delete(schema.rateLimitHits)
      .where(eq(schema.rateLimitHits.id, freshHit!.id));
  });
});
