import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  createPhoneTypingController,
  isKeyboardOpen,
  keyboardInsetPx,
  KEYBOARD_OPEN_DELTA_PX,
  phoneEditorChrome,
  PHONE_TYPING_IDLE_MS,
} from "./phone-typing";

describe("isKeyboardOpen", () => {
  it("is open when the visual viewport is more than 150 px shorter", () => {
    expect(isKeyboardOpen(844, 844 - KEYBOARD_OPEN_DELTA_PX - 1)).toBe(true);
    expect(isKeyboardOpen(844, 844 - KEYBOARD_OPEN_DELTA_PX)).toBe(false);
    expect(isKeyboardOpen(844, 844)).toBe(false);
  });
});

describe("keyboardInsetPx", () => {
  it("is the gap below the visual viewport", () => {
    expect(keyboardInsetPx(844, 500, 0)).toBe(344);
    expect(keyboardInsetPx(844, 500, 40)).toBe(304);
    expect(keyboardInsetPx(844, 900, 0)).toBe(0);
  });
});

describe("phoneEditorChrome", () => {
  it("keeps keyboardOpen and typingActive independent", () => {
    expect(phoneEditorChrome(true, false)).toEqual({
      slimWindow: true,
      fadeControls: false,
    });
    expect(phoneEditorChrome(false, true)).toEqual({
      slimWindow: false,
      fadeControls: true,
    });
    expect(phoneEditorChrome(true, true)).toEqual({
      slimWindow: true,
      fadeControls: true,
    });
    expect(phoneEditorChrome(false, false)).toEqual({
      slimWindow: false,
      fadeControls: false,
    });
  });

  it("slims the window on keyboardOpen, not on typingActive", () => {
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
    const phone = css.split("@media (max-width: 767px)")[1] ?? "";
    expect(phone).toMatch(
      /\.keyboard-open\s*\{[\s\S]*?--phone-window-height:\s*56px/,
    );
    const typingBlock = phone.match(/\.typing-active\s*\{[^}]*\}/)?.[0] ?? "";
    expect(typingBlock).not.toMatch(/--phone-window-height/);
  });
});

describe("createPhoneTypingController", () => {
  it("fades on input, returns after 2 s, and returns on keyboard close", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const controller = createPhoneTypingController(onChange);

    expect(controller.active).toBe(false);
    controller.noteInput();
    expect(controller.active).toBe(true);
    expect(onChange).toHaveBeenLastCalledWith(true);

    vi.advanceTimersByTime(PHONE_TYPING_IDLE_MS - 1);
    expect(controller.active).toBe(true);

    vi.advanceTimersByTime(1);
    expect(controller.active).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(false);

    controller.noteInput();
    expect(controller.active).toBe(true);
    controller.release();
    expect(controller.active).toBe(false);
    expect(onChange).toHaveBeenLastCalledWith(false);

    controller.noteInput();
    vi.advanceTimersByTime(500);
    controller.noteInput();
    vi.advanceTimersByTime(PHONE_TYPING_IDLE_MS - 1);
    expect(controller.active).toBe(true);
    vi.advanceTimersByTime(1);
    expect(controller.active).toBe(false);

    controller.dispose();
    vi.useRealTimers();
  });
});
