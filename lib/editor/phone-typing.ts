export const PHONE_TYPING_IDLE_MS = 2000;
export const KEYBOARD_OPEN_DELTA_PX = 150;

export function isKeyboardOpen(
  layoutHeight: number,
  visualHeight: number,
): boolean {
  return layoutHeight - visualHeight > KEYBOARD_OPEN_DELTA_PX;
}

/** Space between the visual viewport's bottom and the layout viewport's bottom. */
export function keyboardInsetPx(
  layoutHeight: number,
  visualHeight: number,
  visualOffsetTop: number,
): number {
  return Math.max(0, layoutHeight - (visualHeight + visualOffsetTop));
}

export type TypingClock = {
  setTimeout: (fn: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimeout: (id: ReturnType<typeof setTimeout>) => void;
};

const defaultClock: TypingClock = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id),
};

/**
 * Phone typing chrome: active on input, idle after `idleMs`, or when released
 * (scroll, keyboard close).
 */
export function createPhoneTypingController(
  onChange: (active: boolean) => void,
  clock: TypingClock = defaultClock,
  idleMs = PHONE_TYPING_IDLE_MS,
) {
  let active = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const setActive = (next: boolean) => {
    if (active === next) return;
    active = next;
    onChange(next);
  };

  const clearTimer = () => {
    if (timer === null) return;
    clock.clearTimeout(timer);
    timer = null;
  };

  return {
    get active() {
      return active;
    },
    noteInput() {
      setActive(true);
      clearTimer();
      timer = clock.setTimeout(() => {
        timer = null;
        setActive(false);
      }, idleMs);
    },
    release() {
      clearTimer();
      setActive(false);
    },
    dispose() {
      clearTimer();
    },
  };
}
