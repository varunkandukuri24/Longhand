import { conditionFor } from "./condition";
import { roundCoord } from "./coords";
import type { Condition } from "./types";

export type WeatherPayload = {
  condition: Condition;
  /** ISO local sunrise for today at the coordinates. */
  sunrise: string;
  /** ISO local sunset for today at the coordinates. */
  sunset: string;
  source: "weather" | "defaults";
};

type CacheEntry = {
  expiresAt: number;
  payload: WeatherPayload;
};

const CACHE_TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

export function cacheKey(latitude: number, longitude: number): string {
  return `${roundCoord(latitude)},${roundCoord(longitude)}`;
}

export function clearWeatherCache(): void {
  cache.clear();
}

type ForecastResponse = {
  current?: { weather_code?: number };
  daily?: {
    sunrise?: string[];
    sunset?: string[];
  };
};

/**
 * Fetch current weather plus today's sunrise/sunset from Open-Meteo,
 * cached per rounded coordinates for 60 minutes.
 */
export async function fetchWeatherForCoords(
  latitude: number,
  longitude: number,
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
): Promise<WeatherPayload> {
  const key = cacheKey(latitude, longitude);
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return hit.payload;
  }

  const lat = roundCoord(latitude);
  const lon = roundCoord(longitude);
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("current", "weather_code");
  url.searchParams.set("daily", "sunrise,sunset");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "auto");

  const res = await fetchImpl(url.toString(), {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) {
    throw new Error(`weather ${res.status}`);
  }

  const body = (await res.json()) as ForecastResponse;
  const code = body.current?.weather_code;
  const sunrise = body.daily?.sunrise?.[0];
  const sunset = body.daily?.sunset?.[0];
  if (typeof code !== "number" || !sunrise || !sunset) {
    throw new Error("weather malformed");
  }

  const payload: WeatherPayload = {
    condition: conditionFor(code),
    sunrise,
    sunset,
    source: "weather",
  };
  cache.set(key, { expiresAt: now + CACHE_TTL_MS, payload });
  return payload;
}
