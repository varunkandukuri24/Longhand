import { db } from "@/db";
import { pieces } from "@/db/schema";
import { dashboardDisplayTitle } from "@/lib/dashboard/display-title";
import { loadPieceState } from "@/lib/pieces/load-state";
import { isUntouchedEmptyDraft } from "@/lib/pieces/open-fresh-piece";
import { wordCount } from "@/lib/receipt/compute-receipt";
import { desc, eq } from "drizzle-orm";

export type ListedPiece = {
  id: string;
  display: ReturnType<typeof dashboardDisplayTitle>;
  status: "draft" | "published";
  visibility: "public" | "private";
  slug: string | null;
  words: number;
  updatedAt: Date;
  /** Lowercased title + body for client-side search. */
  searchText: string;
};

/**
 * Pieces for the Your pieces pane: newest first.
 * Untouched empty drafts are omitted unless `currentPieceId` is that draft.
 */
export async function listUserPieces(
  userId: string,
  currentPieceId?: string | null,
): Promise<ListedPiece[]> {
  const userPieces = await db
    .select({
      id: pieces.id,
      title: pieces.title,
      status: pieces.status,
      visibility: pieces.visibility,
      slug: pieces.slug,
      finalText: pieces.finalText,
      draftText: pieces.draftText,
      updatedAt: pieces.updatedAt,
    })
    .from(pieces)
    .where(eq(pieces.userId, userId))
    .orderBy(desc(pieces.updatedAt));

  const listed: ListedPiece[] = [];

  for (const piece of userPieces) {
    if (piece.status === "draft" && piece.id !== currentPieceId) {
      if (await isUntouchedEmptyDraft(piece.id)) {
        continue;
      }
    }

    let text = "";
    if (piece.status === "published") {
      text = piece.finalText ?? "";
    } else if (piece.draftText != null) {
      text = piece.draftText;
    } else {
      const state = await loadPieceState(piece.id);
      text = state.text;
    }

    const display = dashboardDisplayTitle({
      title: piece.title,
      bodyText: text,
    });

    listed.push({
      id: piece.id,
      display,
      status: piece.status,
      visibility: piece.visibility,
      slug: piece.slug,
      words: wordCount(text),
      updatedAt: piece.updatedAt,
      searchText: `${piece.title}\n${text}`.toLowerCase(),
    });
  }

  return listed;
}
