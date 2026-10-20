"use server";

import { auth } from "@/auth";
import { listUserPieces, type ListedPiece } from "@/lib/pieces/list-pieces";

export type PanePiece = {
  id: string;
  label: string;
  muted: boolean;
  status: "draft" | "published";
  visibility: "public" | "private";
  slug: string | null;
  words: number;
  updatedAt: string;
  searchText: string;
};

function toPanePiece(piece: ListedPiece): PanePiece {
  return {
    id: piece.id,
    label: piece.display.label,
    muted: piece.display.muted,
    status: piece.status,
    visibility: piece.visibility,
    slug: piece.slug,
    words: piece.words,
    updatedAt: piece.updatedAt.toISOString(),
    searchText: piece.searchText,
  };
}

/**
 * Load the signed-in writer's pieces for the Your pieces pane.
 * Returns only the caller's pieces.
 */
export async function loadYourPieces(
  currentPieceId?: string | null,
): Promise<PanePiece[]> {
  const session = await auth();
  if (!session?.user?.id) {
    return [];
  }
  const listed = await listUserPieces(session.user.id, currentPieceId);
  return listed.map(toPanePiece);
}
