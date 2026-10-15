import { describe, expect, it } from "vitest";
import {
  defaultSunrise,
  defaultSunset,
  lightFor,
  localTimeOnDay,
} from "./light";

function at(
  hours: number,
  minutes: number,
  day = new Date(2026, 5, 15),
): Date {
  return localTimeOnDay(day, hours, minutes);
}

describe("lightFor", () => {
  const day = new Date(2026, 5, 15);
  const sunrise = at(6, 0, day);
  const sunset = at(20, 0, day);

  it("is night before sunrise", () => {
    expect(lightFor(at(5, 59, day), sunrise, sunset)).toBe("night");
  });

  it("is morning from sunrise until 11:00", () => {
    expect(lightFor(at(6, 0, day), sunrise, sunset)).toBe("morning");
    expect(lightFor(at(10, 59, day), sunrise, sunset)).toBe("morning");
  });

  it("switches to afternoon at 11:00", () => {
    expect(lightFor(at(11, 0, day), sunrise, sunset)).toBe("afternoon");
  });

  it("is afternoon until an hour before sunset", () => {
    expect(lightFor(at(18, 59, day), sunrise, sunset)).toBe("afternoon");
  });

  it("starts golden hour one hour before sunset", () => {
    expect(lightFor(at(19, 0, day), sunrise, sunset)).toBe("goldenHour");
  });

  it("ends golden hour 20 minutes after sunset", () => {
    expect(lightFor(at(20, 19, day), sunrise, sunset)).toBe("goldenHour");
    expect(lightFor(at(20, 20, day), sunrise, sunset)).toBe("night");
  });

  it("is night after golden hour", () => {
    expect(lightFor(at(23, 0, day), sunrise, sunset)).toBe("night");
  });
});

describe("no-city defaults", () => {
  it("uses 7:00 sunrise and 19:00 sunset on the device clock", () => {
    const now = new Date(2026, 9, 13, 12, 0, 0);
    expect(defaultSunrise(now)).toEqual(localTimeOnDay(now, 7, 0));
    expect(defaultSunset(now)).toEqual(localTimeOnDay(now, 19, 0));
  });

  it("maps midday with defaults to afternoon", () => {
    const now = new Date(2026, 9, 13, 12, 0, 0);
    expect(lightFor(now, defaultSunrise(now), defaultSunset(now))).toBe(
      "afternoon",
    );
  });

  it("maps early morning with defaults to night", () => {
    const now = new Date(2026, 9, 13, 6, 0, 0);
    expect(lightFor(now, defaultSunrise(now), defaultSunset(now))).toBe(
      "night",
    );
  });
});
