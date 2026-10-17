import { describe, expect, it } from "vitest";
import { typewriterScrollTop, type CaretLineBox } from "./caret-line";

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
});
