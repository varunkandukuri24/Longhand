import { findLinks, labelForUrl } from "@/lib/references";
import type { TextLink } from "./types";

const TRAILING_ONLY = /^[.,;:!?)"'\]]*$/;
const ONE_TRAILING = /^[.,;:!?)"'\]]$/;

/**
 * A URL eligible to shorten just before `wsPos` (index of space/Enter):
 * findLinks in the prefix, with only trailing punctuation between the URL
 * and the whitespace.
 */
export function urlBeforeWhitespace(
  text: string,
  wsPos: number,
): { start: number; end: number; url: string } | null {
  if (wsPos <= 0) return null;
  const prefix = text.slice(0, wsPos);
  const found = findLinks(prefix);
  for (let i = found.length - 1; i >= 0; i -= 1) {
    const link = found[i];
    const between = prefix.slice(link.end);
    if (link.end + between.length === wsPos && TRAILING_ONLY.test(between)) {
      return { start: link.start, end: link.end, url: link.url };
    }
  }
  return null;
}

/**
 * URLs inside [pasteStart, pasteEnd) that are already followed by whitespace
 * (with only trailing punctuation in between).
 */
export function urlsFollowedByWhitespaceInRange(
  text: string,
  pasteStart: number,
  pasteEnd: number,
): Array<{ start: number; end: number; url: string }> {
  const out: Array<{ start: number; end: number; url: string }> = [];
  for (const link of findLinks(text)) {
    if (link.start < pasteStart || link.start >= pasteEnd) continue;
    if (link.end > pasteEnd) continue;
    let i = link.end;
    while (i < text.length && ONE_TRAILING.test(text[i]!)) {
      i += 1;
    }
    if (i < text.length && /\s/.test(text[i]!)) {
      out.push({ start: link.start, end: link.end, url: link.url });
    }
  }
  return out;
}

/**
 * Render-time shorten of any URL still written out in full. Does not emit
 * events; used on publish after the rebuild check.
 */
export function shortenRemainingUrls(
  text: string,
  links: readonly TextLink[],
): { text: string; links: TextLink[] } {
  let nextText = text;
  let nextLinks = links.map((l) => ({ ...l }));

  const overlapsExisting = (start: number, end: number) =>
    nextLinks.some((l) => !(end <= l.start || start >= l.end));

  const raw = findLinks(text)
    .filter((f) => !overlapsExisting(f.start, f.end))
    .sort((a, b) => b.start - a.start);

  for (const found of raw) {
    const label = labelForUrl(found.url);
    const removeLen = found.end - found.start;
    const delta = label.length - removeLen;
    nextText =
      nextText.slice(0, found.start) + label + nextText.slice(found.end);
    nextLinks = nextLinks
      .filter((l) => l.end <= found.start || l.start >= found.end)
      .map((l) =>
        l.start >= found.end
          ? { start: l.start + delta, end: l.end + delta, url: l.url }
          : l,
      );
    nextLinks.push({
      start: found.start,
      end: found.start + label.length,
      url: found.url,
    });
    nextLinks.sort((a, b) => a.start - b.start);
  }

  return { text: nextText, links: nextLinks };
}
