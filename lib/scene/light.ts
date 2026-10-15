import type { Light } from "./types";
import { DEFAULT_SUNRISE, DEFAULT_SUNSET } from "./types";

/** Local wall-clock time on the same calendar day as `day`. */
export function localTimeOnDay(
  day: Date,
  hours: number,
  minutes: number,
): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hours,
    minutes,
    0,
    0,
  );
}

/** Default sunrise on the device-local day of `now`. */
export function defaultSunrise(now: Date): Date {
  return localTimeOnDay(now, DEFAULT_SUNRISE.hours, DEFAULT_SUNRISE.minutes);
}

/** Default sunset on the device-local day of `now`. */
export function defaultSunset(now: Date): Date {
  return localTimeOnDay(now, DEFAULT_SUNSET.hours, DEFAULT_SUNSET.minutes);
}

/**
 * Map local time to light using the PRD boundaries:
 * morning = sunrise → 11:00,
 * afternoon = 11:00 → one hour before sunset,
 * golden hour = one hour before sunset → 20 minutes after sunset,
 * night = the rest.
 */
export function lightFor(now: Date, sunrise: Date, sunset: Date): Light {
  const t = now.getTime();
  const rise = sunrise.getTime();
  const set = sunset.getTime();
  const morningEnd = localTimeOnDay(now, 11, 0).getTime();
  const goldenStart = set - 60 * 60 * 1000;
  const goldenEnd = set + 20 * 60 * 1000;

  if (t >= rise && t < morningEnd) {
    return "morning";
  }
  if (t >= morningEnd && t < goldenStart) {
    return "afternoon";
  }
  if (t >= goldenStart && t < goldenEnd) {
    return "goldenHour";
  }
  return "night";
}
