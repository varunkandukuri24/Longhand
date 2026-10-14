import { db } from "@/db";
import { pieces } from "@/db/schema";
import { loadReceiptBatches } from "@/lib/pieces/load-batches";
import { applyEvents } from "@/lib/receipt/apply-events";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

/**
 * Public replay events. Returns 404 when the piece is missing, unpublished,
 * or the writer left replay private.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;

  const [piece] = await db
    .select({
      id: pieces.id,
      status: pieces.status,
      replayPublic: pieces.replayPublic,
      finalText: pieces.finalText,
    })
    .from(pieces)
    .where(eq(pieces.slug, slug))
    .limit(1);

  if (
    !piece ||
    piece.status !== "published" ||
    !piece.replayPublic ||
    piece.finalText === null
  ) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { batches } = await loadReceiptBatches(piece.id);
  const events = batches.flatMap((batch) => batch.events);
  const rebuilt = applyEvents(events).text;

  return NextResponse.json({
    events,
    finalText: piece.finalText,
    matches: rebuilt === piece.finalText,
  });
}
