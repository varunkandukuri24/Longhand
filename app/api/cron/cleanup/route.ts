import { deleteUnclaimedGuestsOlderThan } from "@/lib/guest/cleanup";
import { GUEST_TTL_MS } from "@/lib/guest/limits";
import { deleteOldRateLimitHits } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }

  const now = new Date();
  const guestsDeleted = await deleteUnclaimedGuestsOlderThan(
    new Date(now.getTime() - GUEST_TTL_MS),
  );
  const hitsDeleted = await deleteOldRateLimitHits(now);

  return Response.json({ ok: true, guestsDeleted, hitsDeleted });
}
