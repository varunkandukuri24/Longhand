import { auth } from "@/auth";
import { db } from "@/db";
import { pieces } from "@/db/schema";
import { getGuest } from "@/lib/guest/get-guest";
import { and, eq } from "drizzle-orm";

export type OwnedPiece = {
  id: string;
  userId: string | null;
  guestId: string | null;
  status: "draft" | "published";
  slug: string | null;
};

const pieceColumns = {
  id: pieces.id,
  userId: pieces.userId,
  guestId: pieces.guestId,
  status: pieces.status,
  slug: pieces.slug,
};

export async function getOwnedPiece(pieceId: string, userId: string) {
  const [piece] = await db
    .select(pieceColumns)
    .from(pieces)
    .where(and(eq(pieces.id, pieceId), eq(pieces.userId, userId)))
    .limit(1);
  return piece ?? null;
}

export type WritableAccess =
  | { piece: OwnedPiece }
  | { piece: null; reason: "unauthorized" | "not_found" };

async function getGuestSafe() {
  try {
    return await getGuest();
  } catch {
    return null;
  }
}

/**
 * A piece the caller may write to: signed-in owner, or the guest whose
 * cookie matches `pieces.guest_id` for a draft.
 */
export async function getWritablePiece(
  pieceId: string,
): Promise<WritableAccess> {
  const session = await auth();
  if (session?.user?.id) {
    const piece = await getOwnedPiece(pieceId, session.user.id);
    return piece
      ? { piece }
      : { piece: null, reason: "not_found" };
  }

  const guest = await getGuestSafe();
  if (!guest) {
    return { piece: null, reason: "unauthorized" };
  }

  const [piece] = await db
    .select(pieceColumns)
    .from(pieces)
    .where(
      and(
        eq(pieces.id, pieceId),
        eq(pieces.guestId, guest.id),
        eq(pieces.status, "draft"),
      ),
    )
    .limit(1);
  return piece
    ? { piece }
    : { piece: null, reason: "not_found" };
}

export function writableErrorResponse(reason: "unauthorized" | "not_found") {
  if (reason === "unauthorized") {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  return Response.json({ error: "not_found" }, { status: 404 });
}
