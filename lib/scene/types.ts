export type Light = "morning" | "afternoon" | "goldenHour" | "night";

export type Condition = "clear" | "cloudy" | "rain" | "snow";

export type WindowSide = "left" | "right";

/** Typical sunrise when the writer has no city (device-local clock). */
export const DEFAULT_SUNRISE = { hours: 7, minutes: 0 } as const;

/** Typical sunset when the writer has no city (device-local clock). */
export const DEFAULT_SUNSET = { hours: 19, minutes: 0 } as const;

export const DEFAULT_CONDITION: Condition = "clear";

export const DEFAULT_WINDOW_SIDE: WindowSide = "left";

/** Fixed window edge while moving the window is parked. */
export const WINDOW_SIDE: WindowSide = "right";

export const LIGHTS: readonly Light[] = [
  "morning",
  "afternoon",
  "goldenHour",
  "night",
] as const;

export const CONDITIONS: readonly Condition[] = [
  "clear",
  "cloudy",
  "rain",
  "snow",
] as const;
