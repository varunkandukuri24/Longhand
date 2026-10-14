import { auth } from "@/auth";
import { getOwnedPiece } from "@/lib/pieces/ownership";
import { loadPieceState } from "@/lib/pieces/load-state";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * Rebuild text and per-character origins by replaying every stored batch
 * in session/seq order with applyEvents.
 */
export async function GET(_request: Request, context: RouteContext) {
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

    const state = await loadPieceState(pieceId);
    return Response.json(state);
  } catch (err) {
    console.error("[state] FAILED", err);
    return Response.json(
      {
        error: "internal",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
