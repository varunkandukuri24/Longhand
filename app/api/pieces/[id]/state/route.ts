import {
  getWritablePiece,
  writableErrorResponse,
} from "@/lib/pieces/ownership";
import { isPieceId } from "@/lib/pieces/piece-id";
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
    const { id: pieceId } = await context.params;
    if (!isPieceId(pieceId)) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    const access = await getWritablePiece(pieceId);
    if (!access.piece) {
      return writableErrorResponse(access.reason);
    }

    const state = await loadPieceState(pieceId);
    return Response.json(state);
  } catch (err) {
    console.error("[state] FAILED", err);
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
