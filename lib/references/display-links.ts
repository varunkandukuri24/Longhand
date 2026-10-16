import { findLinks, labelForUrl, type DocLink } from "@/lib/references";

/**
 * Spans to render as hostname links: stored shortened spans plus any raw
 * URLs still written out in the text (for older pieces with links = null).
 */
export function displayLinksFor(
  text: string,
  stored: readonly DocLink[] | null | undefined,
): DocLink[] {
  const fromStored = (stored ?? []).filter(
    (l) => l.start >= 0 && l.end <= text.length && l.end > l.start,
  );
  const covered = (start: number, end: number) =>
    fromStored.some((l) => !(end <= l.start || start >= l.end));

  const fromRaw: DocLink[] = [];
  for (const found of findLinks(text)) {
    if (covered(found.start, found.end)) continue;
    fromRaw.push({
      start: found.start,
      end: found.end,
      url: found.url,
    });
  }

  return [...fromStored, ...fromRaw].sort((a, b) => a.start - b.start);
}

/** Visible label for a display span (hostname, never the raw URL). */
export function displayLabelFor(text: string, link: DocLink): string {
  const slice = text.slice(link.start, link.end);
  if (/^https?:\/\//i.test(slice)) {
    return labelForUrl(link.url);
  }
  return slice || labelForUrl(link.url);
}
