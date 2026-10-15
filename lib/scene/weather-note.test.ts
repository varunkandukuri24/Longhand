import { describe, expect, it } from "vitest";
import { formatWeatherSessionsNote } from "./weather-note";

describe("formatWeatherSessionsNote", () => {
  it("returns null when no rain or snow", () => {
    expect(formatWeatherSessionsNote(["clear", "cloudy", null])).toBeNull();
  });

  it("formats rain sessions", () => {
    expect(formatWeatherSessionsNote(["rain", "clear", "rain"])).toBe(
      "2 of 3 sessions in the rain",
    );
  });

  it("formats snow sessions", () => {
    expect(formatWeatherSessionsNote(["snow", "clear"])).toBe(
      "1 of 2 sessions in the snow",
    );
  });

  it("lists rain and snow when both appear", () => {
    expect(formatWeatherSessionsNote(["rain", "snow", "clear"])).toBe(
      "1 of 3 sessions in the rain. 1 of 3 sessions in the snow",
    );
  });
});
