import { db } from "@/db";
import { eventBatches, pieces, sessions } from "@/db/schema";
import { and, desc, eq, isNull, or } from "drizzle-orm";

/**
 * Return the newest empty draft for this writer, or create one.
 * Empty means no title and no stored writing (no event batches).
 * Two calls in a row reuse the same piece so empty drafts never pile up.
 */
export async function openFreshPiece(userId: string): Promise<string> {
  const candidates = await db
    .select({
      id: pieces.id,
      draftText: pieces.draftText,
    })
    .from(pieces)
    .where(
      and(
        eq(pieces.userId, userId),
        eq(pieces.status, "draft"),
        eq(pieces.title, ""),
        or(isNull(pieces.draftText), eq(pieces.draftText, "")),
      ),
    )
    .orderBy(desc(pieces.updatedAt))
    .limit(20);

  for (const candidate of candidates) {
    const [batch] = await db
      .select({ id: eventBatches.id })
      .from(eventBatches)
      .innerJoin(sessions, eq(eventBatches.sessionId, sessions.id))
      .where(eq(sessions.pieceId, candidate.id))
      .limit(1);
    if (!batch) {
      return candidate.id;
    }
  }

  const [created] = await db
    .insert(pieces)
    .values({
      userId,
      title: "",
      status: "draft",
    })
    .returning({ id: pieces.id });

  return created!.id;
}

/** True when a draft has no title and no events (untouched empty). */
export async function isUntouchedEmptyDraft(pieceId: string): Promise<boolean> {
  const [piece] = await db
    .select({
      title: pieces.title,
      status: pieces.status,
      draftText: pieces.draftText,
    })
    .from(pieces)
    .where(eq(pieces.id, pieceId))
    .limit(1);

  if (!piece || piece.status !== "draft") return false;
  if (piece.title.trim() !== "") return false;
  if (piece.draftText && piece.draftText.length > 0) return false;

  const [batch] = await db
    .select({ id: eventBatches.id })
    .from(eventBatches)
    .innerJoin(sessions, eq(eventBatches.sessionId, sessions.id))
    .where(eq(sessions.pieceId, pieceId))
    .limit(1);

  return !batch;
}
