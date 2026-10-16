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
  let publishedSlug = "";
  let GET_replay: typeof import("@/app/api/p/[slug]/replay/route").GET;

  beforeAll(async () => {
    ({ GET: GET_replay } = await import("@/app/api/p/[slug]/replay/route"));

    await db.insert(schema.users).values({
      id: userId,
      email: `${userId}@example.test`,
      name: "Replayer",
    });

    const [piece] = await db
      .insert(schema.pieces)
      .values({ userId, title: "Published piece" })
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
      title: "Published piece",
      finalText: "hello",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("publish failed");
    }
    publishedSlug = result.slug;
  });

  afterAll(async () => {
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    await client.end();
  });

  it("returns 404 for a published piece (public replay removed)", async () => {
    const res = await GET_replay(new Request("http://localhost/api/replay"), {
      params: Promise.resolve({ slug: publishedSlug }),
    });
    expect(res.status).toBe(404);
  });
});
