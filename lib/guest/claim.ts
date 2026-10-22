import { db } from "@/db";
import { guests, pieces } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { hashGuestToken } from "./cookie";

/**
 * Move this guest's pieces to the signed-in account. Sessions and batches
 * are left untouched. Returns the claimed piece id, or null if none.
 */
export async function claimGuestPieces(args: {
  token: string;
  userId: string;
  now?: Date;
}): Promise<string | null> {
  const now = args.now ?? new Date();
  const tokenHash = hashGuestToken(args.token);

  return db.transaction(async (tx) => {
    const [guest] = await tx
      .select({ id: guests.id })
      .from(guests)
      .where(and(eq(guests.tokenHash, tokenHash), isNull(guests.claimedBy)))
      .limit(1)
      .for("update");

    if (!guest) return null;

    const guestPieces = await tx
      .select({ id: pieces.id })
      .from(pieces)
      .where(eq(pieces.guestId, guest.id));

    if (guestPieces.length === 0) {
      await tx
        .update(guests)
        .set({ claimedBy: args.userId, claimedAt: now })
        .where(eq(guests.id, guest.id));
      return null;
    }

    await tx
      .update(pieces)
      .set({
        userId: args.userId,
        guestId: null,
        updatedAt: now,
      })
      .where(eq(pieces.guestId, guest.id));

    await tx
      .update(guests)
      .set({ claimedBy: args.userId, claimedAt: now })
      .where(eq(guests.id, guest.id));

    return guestPieces[0]?.id ?? null;
  });
}
