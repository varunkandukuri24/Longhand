import { auth } from "@/auth";
import { isClientAnalyticsEventName } from "@/lib/analytics/names";
import { track, validateTrackInput } from "@/lib/analytics/track";
import { clientIpFromHeaders } from "@/lib/auth/sign-in-rate-limit";
import { readGuestCookie } from "@/lib/guest/cookie";
import { lookupGuestByToken } from "@/lib/guest/get-guest";
import { allow } from "@/lib/rate-limit";

const EVENTS_IP_BUCKET = "events_ip";
const EVENTS_IP_LIMIT = 120;
const EVENTS_IP_WINDOW_MS = 60 * 60 * 1000;

type Body = {
  name?: unknown;
  props?: unknown;
};

/**
 * Accept allowlisted client analytics events only. Unknown names are ignored
 * (200) so scrapers learn nothing. Rate-limited per IP.
 */
export async function POST(request: Request) {
  try {
    const ip = await clientIpFromHeaders();
    const allowed = await allow(
      EVENTS_IP_BUCKET,
      ip,
      EVENTS_IP_LIMIT,
      EVENTS_IP_WINDOW_MS,
    );
    if (!allowed) {
      return Response.json({ error: "rate_limited" }, { status: 429 });
    }

    let body: Body;
    try {
      body = (await request.json()) as Body;
    } catch {
      return Response.json({ ok: true });
    }

    if (
      typeof body.name !== "string" ||
      !isClientAnalyticsEventName(body.name)
    ) {
      return Response.json({ ok: true });
    }

    const validated = validateTrackInput(body.name, body.props);
    if (!validated.ok) {
      return Response.json({ ok: true });
    }

    const session = await auth();
    let guestId: string | null = null;
    if (!session?.user?.id) {
      const token = await readGuestCookie();
      if (token) {
        const guest = await lookupGuestByToken(token);
        guestId = guest?.id ?? null;
      }
    }

    await track(validated.name, {
      userId: session?.user?.id ?? null,
      guestId,
      props: validated.props as never,
    });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[events] FAILED", err);
    return Response.json({ ok: true });
  }
}
