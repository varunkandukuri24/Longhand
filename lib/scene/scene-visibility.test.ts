import { describe, expect, it, vi } from "vitest";
import {
  NO_SCENE_TRANSITION_CLASS,
  shouldCrossfadeScene,
  withNoSceneTransition,
} from "./scene-visibility";

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

describe("withNoSceneTransition", () => {
  it("adds the no-transition class for one frame, then removes it", () => {
    const classes = new Set<string>();
    const root = {
      classList: {
        add: (name: string) => {
          classes.add(name);
        },
        remove: (name: string) => {
          classes.delete(name);
        },
        contains: (name: string) => classes.has(name),
      },
    } as unknown as HTMLElement;
    const callbacks: FrameRequestCallback[] = [];
    const raf = vi.fn((cb: FrameRequestCallback) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    let applied = false;

    withNoSceneTransition(
      root,
      () => {
        applied = true;
        expect(root.classList.contains(NO_SCENE_TRANSITION_CLASS)).toBe(true);
      },
      raf,
    );

    expect(applied).toBe(true);
    expect(root.classList.contains(NO_SCENE_TRANSITION_CLASS)).toBe(true);
    expect(raf).toHaveBeenCalledOnce();
    callbacks[0](0);
    expect(root.classList.contains(NO_SCENE_TRANSITION_CLASS)).toBe(false);
  });

  it("still applies the snap when there is no root element", () => {
    let applied = false;
    withNoSceneTransition(null, () => {
      applied = true;
    });
    expect(applied).toBe(true);
  });
});
