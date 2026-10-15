import { describe, expect, it } from "vitest";
import { conditionFor } from "./condition";

describe("conditionFor", () => {
  it("maps 0–1 to clear", () => {
    expect(conditionFor(0)).toBe("clear");
    expect(conditionFor(1)).toBe("clear");
  });

  it("maps cloudy and fog codes to cloudy", () => {
    for (const code of [2, 3, 45, 48]) {
      expect(conditionFor(code)).toBe("cloudy");
    }
  });

  it("maps drizzle, rain, showers, and storms to rain", () => {
    for (const code of [51, 55, 61, 67, 80, 81, 82, 95, 96, 99]) {
      expect(conditionFor(code)).toBe("rain");
    }
  });

  it("maps snow codes to snow", () => {
    for (const code of [71, 73, 75, 77, 85, 86]) {
      expect(conditionFor(code)).toBe("snow");
    }
  });

  it("defaults unknown codes to clear", () => {
    expect(conditionFor(999)).toBe("clear");
    expect(conditionFor(Number.NaN)).toBe("clear");
  });
});
