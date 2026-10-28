import { describe, expect, it } from "vitest";
import { CONDITIONS, LIGHTS } from "./types";
import { captionFor, TOP_WINDOW_SCENE_OPTS, windowSceneFor } from "./window";

describe("windowSceneFor", () => {
  it("covers all 16 light × condition combinations", () => {
    for (const light of LIGHTS) {
      for (const condition of CONDITIONS) {
        const scene = windowSceneFor(light, condition);
        expect(scene.sky).toMatch(/^rgb\(/);
        expect(scene.ground).toMatch(/^rgb\(/);
        expect(scene.roof.length).toBeGreaterThan(10);
        expect(scene.groundH).toBe("9%");
        expect(Array.isArray(scene.back)).toBe(true);
        expect(Array.isArray(scene.front)).toBe(true);
      }
    }
  });

  it("puts a snow cap only on snow scenes", () => {
    expect(windowSceneFor("morning", "snow").snowCap).toBe(true);
    expect(windowSceneFor("morning", "clear").snowCap).toBe(false);
  });

  it("returns sun and moon as separate fields, not in back layers", () => {
    const morning = windowSceneFor("morning", "clear");
    expect(morning.sun).toEqual({
      x: 16,
      y: 14,
      size: 15,
      color: "#FFE9AE",
      halo: "rgba(255,233,174,0.35)",
    });
    expect(morning.moon).toBe(false);
    expect(morning.back.some((e) => e.kind === "sun" || e.kind === "moon")).toBe(
      false,
    );

    const night = windowSceneFor("night", "clear");
    expect(night.sun).toBeNull();
    expect(night.moon).toBe(true);
    expect(night.back.some((e) => e.kind === "moon" || e.kind === "sun")).toBe(
      false,
    );

    const cloudy = windowSceneFor("afternoon", "cloudy");
    expect(cloudy.sun).toBeNull();
    expect(cloudy.moon).toBe(false);
  });

  it("draws daytime snow flakes with an outline", () => {
    const scene = windowSceneFor("afternoon", "snow");
    const flake = scene.front.find((e) => e.kind === "snow");
    expect(flake).toBeDefined();
    expect(flake?.style).toContain("rgba(70,85,105,0.3)");
  });

  it("uses 24% rooftops on the phone strip and keeps the sun inside", () => {
    for (const light of LIGHTS) {
      for (const condition of CONDITIONS) {
        const scene = windowSceneFor(light, condition, TOP_WINDOW_SCENE_OPTS);
        expect(scene.groundH).toBe("24%");
        if (scene.sun) {
          expect(scene.sun.y).toBeGreaterThanOrEqual(0);
          expect(scene.sun.y + scene.sun.size).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("is deterministic for the same inputs", () => {
    expect(windowSceneFor("night", "clear")).toEqual(
      windowSceneFor("night", "clear"),
    );
  });
});

describe("captionFor", () => {
  it("names clear scenes by light", () => {
    expect(captionFor("morning", "clear")).toBe("Clear morning");
    expect(captionFor("afternoon", "clear")).toBe("Sunny");
    expect(captionFor("goldenHour", "clear")).toBe("Sunset");
    expect(captionFor("night", "clear")).toBe("Clear night");
  });

  it("names weather scenes", () => {
    expect(captionFor("morning", "cloudy")).toBe("Overcast");
    expect(captionFor("afternoon", "rain")).toBe("Raining");
    expect(captionFor("night", "snow")).toBe("Snowing");
  });
});
