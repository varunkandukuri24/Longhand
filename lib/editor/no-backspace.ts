/** Native beforeinput types that remove text (or undo that would). */
export function shouldBlockBeforeInput(inputType: string): boolean {
  return inputType.startsWith("delete") || inputType === "historyUndo";
}

type KeyLike = {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
};

/** Safari keydown fallback when beforeinput is incomplete. */
export function shouldBlockKeydown(event: KeyLike): boolean {
  if (event.key === "Backspace" || event.key === "Delete") {
    return true;
  }

  const mod = event.metaKey || event.ctrlKey;
  if (!mod) {
    return false;
  }

  const key = event.key.toLowerCase();
  return key === "x" || key === "z";
}
