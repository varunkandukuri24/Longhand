import { describe, expect, it } from "vitest";
import { isEditEvent } from "./edit-event";

describe("isEditEvent", () => {
  it("accepts insert, delete, paste, and link with url", () => {
    expect(
      isEditEvent({ t: 0, type: "insert", pos: 0, len: 1, text: "a" }),
    ).toBe(true);
    expect(
      isEditEvent({ t: 0, type: "delete", pos: 0, len: 1, text: "a" }),
    ).toBe(true);
    expect(
      isEditEvent({ t: 0, type: "paste", pos: 0, len: 1, text: "a" }),
    ).toBe(true);
    expect(
      isEditEvent({
        t: 0,
        type: "link",
        pos: 0,
        len: 10,
        text: "example.com",
        url: "https://example.com/x",
      }),
    ).toBe(true);
  });

  it("rejects link without url and unknown types", () => {
    expect(
      isEditEvent({
        t: 0,
        type: "link",
        pos: 0,
        len: 10,
        text: "example.com",
      }),
    ).toBe(false);
    expect(
      isEditEvent({ t: 0, type: "unlink", pos: 0, len: 1, text: "a" }),
    ).toBe(false);
  });
});
