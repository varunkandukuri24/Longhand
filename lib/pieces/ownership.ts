import { db } from "@/db";
import { pieces } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function getOwnedPiece(pieceId: string, userId: string) {
  const [piece] = await db
    .select({
      id: pieces.id,
      userId: pieces.userId,
      status: pieces.status,
      slug: pieces.slug,
    })
    .from(pieces)
    .where(and(eq(pieces.id, pieceId), eq(pieces.userId, userId)))
    .limit(1);
  return piece ?? null;
}
