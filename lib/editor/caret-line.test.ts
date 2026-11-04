import { describe, expect, it } from "vitest";
import {
  TYPEWRITER_MIN_ABOVE_BOTTOM_PX,
  TYPEWRITER_PHONE_MIN_ABOVE_BOTTOM_PX,
  typewriterScrollTop,
  type CaretLineBox,
} from "./caret-line";

function fakeScroll(clientHeight: number): HTMLElement {
  return { clientHeight } as HTMLElement;
}

describe("typewriterScrollTop", () => {
  it("returns null when the line is already high enough", () => {
    const caret: CaretLineBox = {
      offsetTop: 100,
      height: 34,
      spaceBelow: 200,
    };
    expect(typewriterScrollTop(fakeScroll(400), caret, 160)).toBeNull();
  });

  it("scrolls so the line sits minAboveBottom above the visible bottom", () => {
    const caret: CaretLineBox = {
      offsetTop: 500,
      height: 34,
      spaceBelow: 40,
    };
    // target content Y of line bottom + 160 = 500+34+160 = 694
    // scrollTop = 694 - 400 = 294
    expect(typewriterScrollTop(fakeScroll(400), caret, 160)).toBe(294);
  });

  it("never returns a negative scrollTop", () => {
    const caret: CaretLineBox = {
      offsetTop: 10,
      height: 34,
      spaceBelow: 50,
    };
    expect(typewriterScrollTop(fakeScroll(400), caret, 160)).toBe(0);
  });

  it("uses a shorter margin on phones than on desktop", () => {
    expect(TYPEWRITER_MIN_ABOVE_BOTTOM_PX).toBe(160);
    expect(TYPEWRITER_PHONE_MIN_ABOVE_BOTTOM_PX).toBe(48);
    const caret: CaretLineBox = {
      offsetTop: 200,
      height: 30,
      spaceBelow: 20,
    };
    // 200+30+48 - 250 = 28
    expect(
      typewriterScrollTop(fakeScroll(250), caret, TYPEWRITER_PHONE_MIN_ABOVE_BOTTOM_PX),
    ).toBe(28);
  });
});
