export type FoundLink = {
  url: string;
  start: number;
  end: number;
};

export type Reference = {
  url: string;
  label: string;
};

const TRAILING_PUNCT = /[.,;:!?)"'\]]+$/;

/**
 * Every http:// or https:// URL up to the next whitespace, with trailing
 * . , ; : ! ? ) ] " ' trimmed. Ranges are [start, end) into `text`.
 */
export function findLinks(text: string): FoundLink[] {
  const found: FoundLink[] = [];
  const re = /https?:\/\/\S+/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    let url = match[0];
    let end = match.index + url.length;
    const trimmed = url.replace(TRAILING_PUNCT, "");
    if (trimmed.length < url.length) {
      end = match.index + trimmed.length;
      url = trimmed;
    }
    if (url.length === 0) continue;
    found.push({ url, start: match.index, end });
  }
  return found;
}

/** Hostname lowercase, without a leading "www.". */
export function labelForUrl(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return url;
  }
}

export type DocLink = {
  start: number;
  end: number;
  url: string;
};

/**
 * Unique URLs in first-appearance order from shortened spans and any raw
 * URLs still written out in the text.
 */
export function referencesFor(
  text: string,
  links: readonly DocLink[] = [],
): Reference[] {
  type Hit = { start: number; url: string };
  const hits: Hit[] = [
    ...links.map((l) => ({ start: l.start, url: l.url })),
    ...findLinks(text).map((l) => ({ start: l.start, url: l.url })),
  ];
  hits.sort((a, b) => a.start - b.start || a.url.localeCompare(b.url));

  const seen = new Set<string>();
  const refs: Reference[] = [];
  for (const hit of hits) {
    if (seen.has(hit.url)) continue;
    seen.add(hit.url);
    refs.push({ url: hit.url, label: labelForUrl(hit.url) });
  }
  return refs;
}
