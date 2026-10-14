/**
 * Extract og:title (fallback <title>) and og:site_name from HTML.
 * Never stores article body — callers keep only these fields.
 */
export function parseSourceMeta(
  html: string,
  hostname: string,
): { title: string; siteName: string } {
  const ogTitle = metaContent(html, "og:title");
  const titleTag = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  const ogSite = metaContent(html, "og:site_name");

  const title = decodeEntities((ogTitle || titleTag || hostname).trim()) || hostname;
  const siteName = decodeEntities((ogSite || hostname).trim()) || hostname;

  return { title, siteName };
}

function metaContent(html: string, property: string): string | null {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      "i",
    ),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
