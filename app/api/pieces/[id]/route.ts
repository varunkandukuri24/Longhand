import { auth } from "@/auth";
import { db } from "@/db";
import { pieces } from "@/db/schema";
import { getOwnedPiece } from "@/lib/pieces/ownership";
import { and, eq } from "drizzle-orm";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const TITLE_MAX = 120;

/**
 * Update piece metadata that is not part of the writing record (title).
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
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
      return Response.json({ error: "frozen" }, { status: 409 });
    }

    const body = (await request.json().catch(() => null)) as {
      title?: unknown;
    } | null;
    if (!body || typeof body.title !== "string") {
      return Response.json({ error: "invalid_body" }, { status: 400 });
    }

    const title = body.title
      .replace(/\r\n/g, "\n")
      .split("\n")[0]
      .slice(0, TITLE_MAX);

    await db
      .update(pieces)
      .set({ title })
      .where(and(eq(pieces.id, pieceId), eq(pieces.userId, session.user.id)));

    return Response.json({ title });
  } catch (err) {
    console.error("[piece PATCH] FAILED", err);
    return Response.json(
      {
        error: "internal",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
