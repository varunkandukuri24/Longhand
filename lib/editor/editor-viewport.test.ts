import { describe, expect, it } from "vitest";
import { visualViewportBox } from "./editor-viewport";

describe("visualViewportBox", () => {
  it("uses the visual viewport when present", () => {
    expect(visualViewportBox({ offsetTop: 40, height: 480 }, 844)).toEqual({
      top: 40,
      height: 480,
    });
  });

  it("falls back to the layout viewport", () => {
    expect(visualViewportBox(null, 844)).toEqual({ top: 0, height: 844 });
  });
});
