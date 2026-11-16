import { describe, expect, it } from "vitest";
import {
  blankPlaceholder,
  GUEST_INTRO_PLACEHOLDER,
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

  it("keeps a separate intro placeholder", () => {
    expect(GUEST_INTRO_PLACEHOLDER).toBe("Start typing. No account needed.");
  });
});
