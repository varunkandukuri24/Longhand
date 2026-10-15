import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  DEFAULT_CONDITION,
  DEFAULT_SUNRISE,
  DEFAULT_SUNSET,
} from "@/lib/scene";
import { fetchWeatherForCoords } from "@/lib/scene/weather-cache";
import { eq } from "drizzle-orm";

function defaultsPayload() {
  return {
    condition: DEFAULT_CONDITION,
    sunriseHour: DEFAULT_SUNRISE.hours,
    sunriseMinute: DEFAULT_SUNRISE.minutes,
    sunsetHour: DEFAULT_SUNSET.hours,
    sunsetMinute: DEFAULT_SUNSET.minutes,
    source: "defaults" as const,
    hasCity: false,
  };
}

/**
 * Current weather + today's sunrise/sunset for the signed-in writer's city.
 * No city → typical 7:00 / 19:00 defaults and clear condition (no IP lookup).
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const [row] = await db
    .select({
      latitude: users.latitude,
      longitude: users.longitude,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (
    row?.latitude == null ||
    row?.longitude == null ||
    !Number.isFinite(row.latitude) ||
    !Number.isFinite(row.longitude)
  ) {
    return Response.json(defaultsPayload());
  }

  try {
    const weather = await fetchWeatherForCoords(row.latitude, row.longitude);
    return Response.json({
      condition: weather.condition,
      sunrise: weather.sunrise,
      sunset: weather.sunset,
      source: weather.source,
      hasCity: true,
    });
  } catch {
    return Response.json(defaultsPayload());
  }
}
