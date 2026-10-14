import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { eq } from "drizzle-orm";
import * as schema from "@/db/schema";
import { GENESIS_PREV_HASH, hashBatch } from "@/lib/receipt/hash";
import { sha256HexNode } from "@/lib/receipt/sha256-node";
import type { EditEvent } from "@/lib/receipt/types";
import { publishPiece } from "./publish";

const url = process.env.DATABASE_URL;

describe.skipIf(!url)("GET /api/p/[slug]/replay", () => {
  const client = postgres(url!, { max: 1 });
  const db = drizzle(client, { schema });
  const userId = `replay-${crypto.randomUUID()}`;
  let privateSlug = "";
  let publicSlug = "";
  let GET_replay: typeof import("@/app/api/p/[slug]/replay/route").GET;

  beforeAll(async () => {
    ({ GET: GET_replay } = await import("@/app/api/p/[slug]/replay/route"));

    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@example.test`,
      name: "Replayer",
    });

    async function seedAndPublish(title: string, replayPublic: boolean) {
      const [piece] = await db
        .insert(schema.pieces)
        .values({ userId, title })
        .returning({ id: schema.pieces.id });

      const [writingSession] = await db
        .insert(schema.sessions)
        .values({ pieceId: piece.id })
        .returning({ id: schema.sessions.id });

      await db
        .update(schema.pieces)
        .set({ activeSessionId: writingSession.id })
        .where(eq(schema.pieces.id, piece.id));

      const events: EditEvent[] = [
        { t: 0, type: "insert", pos: 0, len: 5, text: "hello" },
      ];
      const hash = await hashBatch(GENESIS_PREV_HASH, 1, events, sha256HexNode);
      await db.insert(schema.eventBatches).values({
        sessionId: writingSession.id,
        seq: 1,
        events,
        prevHash: GENESIS_PREV_HASH,
        hash,
        clientTStart: 0,
        clientTEnd: 0,
        delayed: false,
        clockSuspect: false,
      });

      const result = await publishPiece({
        pieceId: piece.id,
        userId,
        title,
        finalText: "hello",
        replayPublic,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) {
        throw new Error("publish failed");
      }
      return result.slug;
    }

    privateSlug = await seedAndPublish("Private replay", false);
    publicSlug = await seedAndPublish("Public replay", true);
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    await client.end();
  });

  it("returns 404 when replay is off", async () => {
    const res = await GET_replay(new Request("http://localhost/api/replay"), {
      params: Promise.resolve({ slug: privateSlug }),
    });
    expect(res.status).toBe(404);
  });

  it("returns events when replay is public and final frame matches", async () => {
    const res = await GET_replay(new Request("http://localhost/api/replay"), {
      params: Promise.resolve({ slug: publicSlug }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      events: EditEvent[];
      finalText: string;
      matches: boolean;
    };
    expect(body.finalText).toBe("hello");
    expect(body.matches).toBe(true);
    expect(body.events).toHaveLength(1);
  });
});
