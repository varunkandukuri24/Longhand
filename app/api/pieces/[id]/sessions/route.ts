import { auth } from "@/auth";
import { db } from "@/db";
import { pieces, sessions } from "@/db/schema";
import { getOwnedPiece } from "@/lib/pieces/ownership";
import { isPieceId } from "@/lib/pieces/piece-id";
import { CONDITIONS, type Condition } from "@/lib/scene";
import { and, eq, isNull } from "drizzle-orm";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseCondition(raw: unknown): Condition | null {
  if (typeof raw !== "string") return null;
  return (CONDITIONS as readonly string[]).includes(raw)
    ? (raw as Condition)
    : null;
}

/**
 * Start a writing session for a piece. Ends any open session, claims
 * pieces.active_session_id so this session is the sole writer.
 * Stores the ambient condition at session start for the weather note.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    return await postSession(request, context);
  } catch (err) {
    console.error("[sessions] FAILED", err);
    return Response.json({ error: "internal" }, { status: 500 });
  }
}

async function postSession(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id: pieceId } = await context.params;
  if (!isPieceId(pieceId)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }
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

  let condition: Condition | null = null;
  try {
    const body = (await request.json()) as { condition?: unknown };
    condition = parseCondition(body.condition);
  } catch {
    condition = null;
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
        condition,
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
