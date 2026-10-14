import { describe, expect, it } from "vitest";
import {
  shouldBlockBeforeInput,
  shouldBlockKeydown,
} from "./no-backspace";

describe("no-backspace blocking", () => {
  it("blocks every delete* beforeinput type and historyUndo", () => {
    expect(shouldBlockBeforeInput("deleteContentBackward")).toBe(true);
    expect(shouldBlockBeforeInput("deleteContentForward")).toBe(true);
    expect(shouldBlockBeforeInput("deleteWordBackward")).toBe(true);
    expect(shouldBlockBeforeInput("deleteWordForward")).toBe(true);
    expect(shouldBlockBeforeInput("deleteSoftLineBackward")).toBe(true);
    expect(shouldBlockBeforeInput("deleteByCut")).toBe(true);
    expect(shouldBlockBeforeInput("historyUndo")).toBe(true);
  });

  it("allows typing and paste beforeinput types", () => {
    expect(shouldBlockBeforeInput("insertText")).toBe(false);
    expect(shouldBlockBeforeInput("insertFromPaste")).toBe(false);
    expect(shouldBlockBeforeInput("insertFromDrop")).toBe(false);
    expect(shouldBlockBeforeInput("insertLineBreak")).toBe(false);
    expect(shouldBlockBeforeInput("historyRedo")).toBe(false);
  });

  it("blocks Safari keydown fallbacks for Backspace, Delete, cut and undo", () => {
    expect(shouldBlockKeydown({ key: "Backspace", metaKey: false, ctrlKey: false })).toBe(
      true,
    );
    expect(shouldBlockKeydown({ key: "Delete", metaKey: false, ctrlKey: false })).toBe(
      true,
    );
    expect(shouldBlockKeydown({ key: "x", metaKey: true, ctrlKey: false })).toBe(true);
    expect(shouldBlockKeydown({ key: "X", metaKey: false, ctrlKey: true })).toBe(true);
    expect(shouldBlockKeydown({ key: "z", metaKey: true, ctrlKey: false })).toBe(true);
    expect(shouldBlockKeydown({ key: "z", metaKey: false, ctrlKey: true })).toBe(true);
  });

  it("allows normal typing keys and unmodified shortcuts", () => {
    expect(shouldBlockKeydown({ key: "a", metaKey: false, ctrlKey: false })).toBe(false);
    expect(shouldBlockKeydown({ key: "Enter", metaKey: false, ctrlKey: false })).toBe(
      false,
    );
    expect(shouldBlockKeydown({ key: "v", metaKey: true, ctrlKey: false })).toBe(false);
    expect(shouldBlockKeydown({ key: "c", metaKey: true, ctrlKey: false })).toBe(false);
  });
});

/*
Manual checklist (no-backspace ON):
- [ ] Backspace — blocked
- [ ] Delete — blocked
- [ ] Option/Alt+Backspace (delete word) — blocked
- [ ] Cmd+Backspace (delete to line start) — blocked
- [ ] Cut (Cmd/Ctrl+X) — blocked
- [ ] Undo (Cmd/Ctrl+Z) — blocked
- [ ] Typing still inserts characters

Manual checklist (no-backspace OFF):
- [ ] All of the above work normally
*/
