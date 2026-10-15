import type { Condition } from "./types";

/**
 * Plain receipt line when any session was rain or snow.
 * Example: "2 of 3 sessions in the rain"
 */
export function formatWeatherSessionsNote(
  conditions: readonly (Condition | null | undefined)[],
): string | null {
  const total = conditions.length;
  if (total === 0) {
    return null;
  }

  let rain = 0;
  let snow = 0;
  for (const c of conditions) {
    if (c === "rain") rain += 1;
    else if (c === "snow") snow += 1;
  }

  if (rain === 0 && snow === 0) {
    return null;
  }

  const parts: string[] = [];
  if (rain > 0) {
    parts.push(
      rain === 1 && total === 1
        ? "1 session in the rain"
        : `${rain} of ${total} sessions in the rain`,
    );
  }
  if (snow > 0) {
    parts.push(
      snow === 1 && total === 1
        ? "1 session in the snow"
        : `${snow} of ${total} sessions in the snow`,
    );
  }
  return parts.join(". ");
}
