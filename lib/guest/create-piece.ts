import { db } from "@/db";
import { guests, pieces } from "@/db/schema";
import { allow, hashRateLimitKey } from "@/lib/rate-limit";
import {
  GUEST_CREATE_PER_IP,
  GUEST_CREATE_WINDOW_MS,
} from "./limits";
import { generateGuestToken, hashGuestToken } from "./cookie";
import { lookupGuestByToken, getGuestPiece } from "./get-guest";
import { maybeCleanupGuests } from "./cleanup";

export type CreateGuestPieceResult =
  | { ok: true; pieceId: string; token: string; setCookie: boolean }
  | { ok: false; error: "guest_create_limit" };

/**
 * Return the browser's unclaimed guest piece, or create a guest + piece.
 * Does not read or write cookies; the caller sets the cookie when `setCookie`.
 */
export async function createOrGetGuestPieceFor(args: {
  existingToken: string | null;
  ip: string;
  now?: Date;
}): Promise<CreateGuestPieceResult> {
  const now = args.now ?? new Date();
  await maybeCleanupGuests(now);

  if (args.existingToken) {
    const guest = await lookupGuestByToken(args.existingToken);
    if (guest) {
      const piece = await getGuestPiece(guest.id);
      if (piece) {
        return {
          ok: true,
          pieceId: piece.id,
          token: args.existingToken,
          setCookie: false,
        };
      }
    }
  }

  const allowed = await allow(
    "guest_create_ip",
    args.ip,
    GUEST_CREATE_PER_IP,
    GUEST_CREATE_WINDOW_MS,
    now,
  );
  if (!allowed) {
    return { ok: false, error: "guest_create_limit" };
  }

  const token = generateGuestToken();
  const tokenHash = hashGuestToken(token);
  const ipHash = hashRateLimitKey(args.ip);

  const created = await db.transaction(async (tx) => {
    const [guest] = await tx
      .insert(guests)
      .values({
        tokenHash,
        ipHash,
        createdAt: now,
      })
      .returning({ id: guests.id });

    const [piece] = await tx
      .insert(pieces)
      .values({
        guestId: guest.id,
        title: "",
        status: "draft",
      })
      .returning({ id: pieces.id });

    return { pieceId: piece.id };
  });

  return {
    ok: true,
    pieceId: created.pieceId,
    token,
    setCookie: true,
  };
}
