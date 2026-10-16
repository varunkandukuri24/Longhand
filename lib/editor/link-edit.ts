import { labelForUrl } from "@/lib/references";
import type { TextLink } from "@/lib/receipt/types";

/** Link covering the character just before `pos` (for Backspace). */
export function linkEndingAt(
  pos: number,
  links: readonly TextLink[],
): TextLink | null {
  return links.find((l) => l.end === pos) ?? null;
}

/** Replace a selected URL in a textarea with its label via execCommand. */
export function replaceSelectionWithLabel(
  el: HTMLTextAreaElement,
  start: number,
  end: number,
  url: string,
): { label: string; caretAfter: number } {
  const label = labelForUrl(url);
  const caretAfter = start + label.length;
  el.setSelectionRange(start, end);
  document.execCommand("insertText", false, label);
  el.setSelectionRange(caretAfter, caretAfter);
  return { label, caretAfter };
}
