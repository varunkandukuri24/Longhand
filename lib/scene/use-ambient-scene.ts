"use client";

import {
  DEFAULT_CONDITION,
  WINDOW_SIDE,
  defaultSunrise,
  defaultSunset,
  lightFor,
  type Condition,
  type Light,
  type WindowSide,
} from "@/lib/scene";
import { useCallback, useEffect, useRef, useState } from "react";

const WEATHER_POLL_MS = 60 * 60 * 1000;
const LIGHT_POLL_MS = 5 * 60 * 1000;
export const SCENE_PRESET_KEY = "longhand-scene-preset";
export const STILL_WINDOW_KEY = "longhand-still-window";

export type ScenePreset =
  | { mode: "auto" }
  | { mode: "pin"; light: Light; condition: Condition };

export type WeatherSource = "weather" | "defaults";

/** How the displayed scene was chosen (debug preview does not change this). */
export type SceneSourceLabel =
  | "Auto from the weather service"
  | "Auto using defaults"
  | "Pinned";

export type AmbientSceneState = {
  light: Light;
  condition: Condition;
  source: WeatherSource;
  sourceLabel: SceneSourceLabel;
  preset: ScenePreset;
  setPreset: (preset: ScenePreset) => void;
  windowSide: WindowSide;
  stillWindow: boolean;
  setStillWindow: (still: boolean) => void;
  /** Tab-only preview; never written to localStorage or the server. */
  debugOverride: { light: Light; condition: Condition } | null;
  setDebugOverride: (
    override: { light: Light; condition: Condition } | null,
  ) => void;
  /** Dev-only: shorten scene transitions from 3 minutes to 5 seconds. */
  fastTransitions: boolean;
  setFastTransitions: (fast: boolean) => void;
  /**
   * True while a blocking overlay (Your pieces pane or a dialog) is open.
   * Kept for callers; the fixed window no longer reads it for drag.
   */
  windowLocked: boolean;
  setWindowLocked: (locked: boolean) => void;
};

type WeatherResponse = {
  condition?: Condition;
  sunrise?: string;
  sunset?: string;
  sunriseHour?: number;
  sunriseMinute?: number;
  sunsetHour?: number;
  sunsetMinute?: number;
  source?: WeatherSource;
};

function loadPreset(): ScenePreset {
  if (typeof window === "undefined") return { mode: "auto" };
  try {
    const raw = window.localStorage.getItem(SCENE_PRESET_KEY);
    if (!raw) return { mode: "auto" };
    const parsed = JSON.parse(raw) as ScenePreset;
    if (parsed?.mode === "auto") return { mode: "auto" };
    if (parsed?.mode === "pin" && parsed.light && parsed.condition) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return { mode: "auto" };
}

function loadStill(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STILL_WINDOW_KEY) === "1";
  } catch {
    return false;
  }
}

function sunriseSunsetFromWeather(
  now: Date,
  data: WeatherResponse | null,
): { sunrise: Date; sunset: Date } {
  if (data?.sunrise && data?.sunset) {
    const sunrise = new Date(data.sunrise);
    const sunset = new Date(data.sunset);
    if (!Number.isNaN(sunrise.getTime()) && !Number.isNaN(sunset.getTime())) {
      return { sunrise, sunset };
    }
  }
  if (
    typeof data?.sunriseHour === "number" &&
    typeof data?.sunsetHour === "number"
  ) {
    const sunrise = defaultSunrise(now);
    sunrise.setHours(data.sunriseHour, data.sunriseMinute ?? 0, 0, 0);
    const sunset = defaultSunset(now);
    sunset.setHours(data.sunsetHour, data.sunsetMinute ?? 0, 0, 0);
    return { sunrise, sunset };
  }
  return { sunrise: defaultSunrise(now), sunset: defaultSunset(now) };
}

/**
 * Auto light from the device clock and city's sunrise/sunset;
 * condition from weather. Window side is fixed on the right.
 */
export function useAmbientScene(options?: {
  publicPage?: boolean;
}): AmbientSceneState {
  const publicPage = options?.publicPage ?? false;
  const [preset, setPresetState] = useState<ScenePreset>({ mode: "auto" });
  const [stillWindow, setStillWindowState] = useState(false);
  const [debugOverride, setDebugOverrideState] = useState<{
    light: Light;
    condition: Condition;
  } | null>(null);
  const [fastTransitions, setFastTransitions] = useState(false);
  const [windowLocked, setWindowLockedState] = useState(false);
  const windowLockCountRef = useRef(0);
  const setWindowLocked = useCallback((locked: boolean) => {
    if (locked) {
      windowLockCountRef.current += 1;
    } else {
      windowLockCountRef.current = Math.max(0, windowLockCountRef.current - 1);
    }
    setWindowLockedState(windowLockCountRef.current > 0);
  }, []);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (publicPage) return;

    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setPresetState(loadPreset());
      setStillWindowState(loadStill());
    });
    return () => {
      cancelled = true;
    };
  }, [publicPage]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), LIGHT_POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (publicPage) return;

    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/weather");
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as WeatherResponse;
        if (!cancelled) setWeather(body);
      } catch {
        /* keep defaults */
      }
    };
    void load();
    const id = window.setInterval(() => void load(), WEATHER_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [publicPage]);

  const setPreset = (next: ScenePreset) => {
    setPresetState(next);
    try {
      if (next.mode === "auto") {
        window.localStorage.removeItem(SCENE_PRESET_KEY);
      } else {
        window.localStorage.setItem(SCENE_PRESET_KEY, JSON.stringify(next));
      }
    } catch {
      /* ignore */
    }
  };

  const setStillWindow = (still: boolean) => {
    setStillWindowState(still);
    try {
      window.localStorage.setItem(STILL_WINDOW_KEY, still ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  /** Preview only — never touches the Scene pin or localStorage. */
  const setDebugOverride = (
    override: { light: Light; condition: Condition } | null,
  ) => {
    setDebugOverrideState(override);
  };

  const { sunrise, sunset } = sunriseSunsetFromWeather(now, weather);
  const autoLight = lightFor(now, sunrise, sunset);
  const autoCondition = publicPage
    ? DEFAULT_CONDITION
    : (weather?.condition ?? DEFAULT_CONDITION);
  const source: WeatherSource = publicPage
    ? "defaults"
    : (weather?.source ?? "defaults");

  let light = autoLight;
  let condition = autoCondition;

  if (!publicPage && preset.mode === "pin") {
    light = preset.light;
    condition = preset.condition;
  }
  if (!publicPage && debugOverride) {
    light = debugOverride.light;
    condition = debugOverride.condition;
  }

  const sourceLabel: SceneSourceLabel =
    !publicPage && preset.mode === "pin"
      ? "Pinned"
      : source === "weather"
        ? "Auto from the weather service"
        : "Auto using defaults";

  return {
    light,
    condition,
    source,
    sourceLabel,
    preset,
    setPreset,
    windowSide: WINDOW_SIDE,
    stillWindow: publicPage ? false : stillWindow,
    setStillWindow,
    debugOverride,
    setDebugOverride,
    fastTransitions,
    setFastTransitions,
    windowLocked: publicPage ? false : windowLocked,
    setWindowLocked,
  };
}
