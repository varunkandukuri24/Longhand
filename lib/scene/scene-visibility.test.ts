import { describe, expect, it } from "vitest";
import { shouldCrossfadeScene } from "./scene-visibility";

describe("shouldCrossfadeScene", () => {
  it("crossfades when the tab is visible and motion is allowed", () => {
    expect(
      shouldCrossfadeScene({ documentHidden: false, noMotion: false }),
    ).toBe(true);
  });

  it("snaps with no overlay when the tab is hidden", () => {
    expect(
      shouldCrossfadeScene({ documentHidden: true, noMotion: false }),
    ).toBe(false);
  });

  it("snaps under reduced motion or Still window", () => {
    expect(
      shouldCrossfadeScene({ documentHidden: false, noMotion: true }),
    ).toBe(false);
  });
});
