import { describe, expect, it } from "vitest";
import {
  blankPlaceholder,
  GUEST_PLACEHOLDER,
  WRITER_PLACEHOLDER,
} from "./greeting";

describe("blankPlaceholder", () => {
  it("uses Write something for a guest", () => {
    expect(blankPlaceholder("guest")).toBe(GUEST_PLACEHOLDER);
  });

  it("uses What's on your mind? for a signed-in writer", () => {
    expect(blankPlaceholder("writer")).toBe(WRITER_PLACEHOLDER);
  });
});
