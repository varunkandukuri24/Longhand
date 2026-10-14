import { auth } from "@/auth";
import { db } from "@/db";
import { pieces, sessions } from "@/db/schema";
import { getOwnedPiece } from "@/lib/pieces/ownership";
import { and, eq, isNull } from "drizzle-orm";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Start a writing session for a piece. Ends any open session, claims
 * pieces.active_session_id so this session is the sole writer.
 */
export async function POST(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: pieceId } = await context.params;
  const piece = await getOwnedPiece(pieceId, session.user.id);
  if (!piece) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (piece.status === "published") {
    return Response.json(
      { error: "conflict", reason: "published" },
      { status: 409 },
    );
  }

  const now = new Date();

  const created = await db.transaction(async (tx) => {
    await tx
      .update(sessions)
      .set({ endedAt: now })
      .where(and(eq(sessions.pieceId, pieceId), isNull(sessions.endedAt)));

    const [row] = await tx
      .insert(sessions)
      .values({
        pieceId,
        startedAt: now,
      })
      .returning({ id: sessions.id, startedAt: sessions.startedAt });

    await tx
      .update(pieces)
      .set({ activeSessionId: row.id, updatedAt: now })
      .where(eq(pieces.id, pieceId));

    return row;
  });

  return Response.json({
    sessionId: created.id,
    startedAt: created.startedAt.toISOString(),
  });
}
