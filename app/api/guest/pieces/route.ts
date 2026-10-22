import { clientIpFromHeaders } from "@/lib/auth/sign-in-rate-limit";
import {
  readGuestCookie,
  setGuestCookie,
} from "@/lib/guest/cookie";
import { createOrGetGuestPieceFor } from "@/lib/guest/create-piece";

export async function POST() {
  try {
    const existingToken = await readGuestCookie();
    const ip = await clientIpFromHeaders();
    const result = await createOrGetGuestPieceFor({ existingToken, ip });
    if (!result.ok) {
      return Response.json(
        { error: "guest_create_limit" },
        { status: 429 },
      );
    }
    if (result.setCookie) {
      await setGuestCookie(result.token);
    }
    return Response.json({ pieceId: result.pieceId });
  } catch (err) {
    console.error("[guest pieces] FAILED", err);
    return Response.json({ error: "internal" }, { status: 500 });
  }
}
