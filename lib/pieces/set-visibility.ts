import { db } from "@/db";
import { pieces, users } from "@/db/schema";
import { pieceUrl } from "@/lib/piece-urls";
import type { PieceVisibility } from "@/lib/pieces/publish";
import { and, eq } from "drizzle-orm";

export type SetVisibilityResult =
  | { ok: true; visibility: PieceVisibility; url: string; slug: string }
  | { ok: false; status: 404 | 400 | 409; error: string };

export async function setPieceVisibility(input: {
  pieceId: string;
  userId: string;
  visibility: PieceVisibility;
}): Promise<SetVisibilityResult> {
  if (input.visibility !== "public" && input.visibility !== "private") {
    return { ok: false, status: 400, error: "invalid_body" };
  }

  const [piece] = await db
    .select({
      id: pieces.id,
      status: pieces.status,
      slug: pieces.slug,
      visibility: pieces.visibility,
    })
    .from(pieces)
    .where(and(eq(pieces.id, input.pieceId), eq(pieces.userId, input.userId)))
    .limit(1);

  if (!piece || piece.status !== "published" || !piece.slug) {
    return { ok: false, status: 404, error: "not_found" };
  }

  const [author] = await db
    .select({ handle: users.handle })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (!author?.handle) {
    return { ok: false, status: 404, error: "not_found" };
  }

  if (piece.visibility !== input.visibility) {
    await db
      .update(pieces)
      .set({
        visibility: input.visibility,
        updatedAt: new Date(),
      })
      .where(eq(pieces.id, input.pieceId));
  }

  return {
    ok: true,
    visibility: input.visibility,
    slug: piece.slug,
    url: pieceUrl(
      { slug: piece.slug, visibility: input.visibility },
      author.handle,
    ),
  };
}
