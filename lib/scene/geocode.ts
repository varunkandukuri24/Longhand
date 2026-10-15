import { roundCoord } from "./coords";

export type GeocodedCity = {
  cityName: string;
  latitude: number;
  longitude: number;
};

type GeocodeResponse = {
  results?: Array<{
    name?: string;
    latitude?: number;
    longitude?: number;
    admin1?: string;
    country?: string;
  }>;
};

/**
 * Look up a city via Open-Meteo geocoding. Returns null when nothing matches.
 * Stores only city name and coordinates rounded to 1 decimal place.
 */
export async function geocodeCity(
  query: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GeocodedCity | null> {
  const name = query.trim();
  if (!name) {
    return null;
  }

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetchImpl(url.toString(), {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) {
    return null;
  }

  const body = (await res.json()) as GeocodeResponse;
  const hit = body.results?.[0];
  if (
    !hit ||
    typeof hit.latitude !== "number" ||
    typeof hit.longitude !== "number" ||
    !hit.name?.trim()
  ) {
    return null;
  }

  return {
    cityName: hit.name.trim(),
    latitude: roundCoord(hit.latitude),
    longitude: roundCoord(hit.longitude),
  };
}
