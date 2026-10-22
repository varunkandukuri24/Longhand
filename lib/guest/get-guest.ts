import { db } from "@/db";
import { guests, pieces } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { hashGuestToken, readGuestCookie } from "./cookie";

export type GuestRow = {
  id: string;
  createdAt: Date;
};

export async function lookupGuestByToken(
  token: string,
): Promise<GuestRow | null> {
  const tokenHash = hashGuestToken(token);
  const [row] = await db
    .select({
      id: guests.id,
      createdAt: guests.createdAt,
    })
    .from(guests)
    .where(and(eq(guests.tokenHash, tokenHash), isNull(guests.claimedBy)))
    .limit(1);
  return row ?? null;
}

export async function getGuest(): Promise<GuestRow | null> {
  const token = await readGuestCookie();
  if (!token) return null;
  return lookupGuestByToken(token);
}

export async function getGuestPiece(
  guestId: string,
): Promise<{ id: string } | null> {
  const [piece] = await db
    .select({ id: pieces.id })
    .from(pieces)
    .where(and(eq(pieces.guestId, guestId), eq(pieces.status, "draft")))
    .limit(1);
  return piece ?? null;
}
