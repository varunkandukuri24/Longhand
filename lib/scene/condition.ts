import type { Condition } from "./types";
import { DEFAULT_CONDITION } from "./types";

/**
 * Map WMO weather codes to Longhand conditions.
 * 0–1 clear; 2–3, 45, 48 cloudy; 51–67, 80–82, 95–99 rain; 71–77, 85–86 snow.
 * Unknown codes fall back to clear.
 */
export function conditionFor(weatherCode: number): Condition {
  if (!Number.isFinite(weatherCode)) {
    return DEFAULT_CONDITION;
  }
  const code = Math.trunc(weatherCode);

  if (code === 0 || code === 1) {
    return "clear";
  }
  if (code === 2 || code === 3 || code === 45 || code === 48) {
    return "cloudy";
  }
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99)
  ) {
    return "rain";
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return "snow";
  }

  return DEFAULT_CONDITION;
}
