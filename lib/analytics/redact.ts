/**
 * Collapse private ids and strip sensitive query params before a page view
 * is sent to Vercel Web Analytics.
 */

export type AnalyticsBeforeSendEvent = {
  type?: string;
  url: string;
};

const KEEP_QUERY = /^(utm_.+|ref)$/i;

function isWriterSubdomain(host: string, root: string): boolean {
  const suffix = `.${root}`;
  if (!host.endsWith(suffix)) return false;
  const label = host.slice(0, -suffix.length);
  if (!label || label.includes(".") || label === "www") return false;
  return true;
}

function collapseMainPath(pathname: string): string {
  if (/^\/write\/[^/]+\/?$/.test(pathname)) return "/write/[id]";
  if (/^\/p\/[^/]+\/?$/.test(pathname)) return "/p/[slug]";
  if (/^\/u\/[^/]+\/[^/]+\/?$/.test(pathname)) return "/u/[handle]/[slug]";
  if (/^\/u\/[^/]+\/?$/.test(pathname)) return "/u/[handle]";
  return pathname;
}

function collapseWriterSubdomainPath(pathname: string): string {
  if (pathname === "/" || pathname === "") return "/u/[handle]";
  if (/^\/[^/]+\/?$/.test(pathname) && !pathname.includes("opengraph-image")) {
    return "/u/[handle]/[slug]";
  }
  return "/u/[handle]";
}

function keepAllowedSearch(searchParams: URLSearchParams): string {
  const kept = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (KEEP_QUERY.test(key)) {
      kept.append(key, value);
    }
  }
  const qs = kept.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Rewrite a Vercel Analytics event URL so piece ids, slugs and handles never
 * leave the browser. Returns null only if the URL cannot be parsed.
 */
export function redact<T extends AnalyticsBeforeSendEvent>(
  event: T,
  rootDomain: string,
): T | null {
  let url: URL;
  try {
    url = new URL(event.url);
  } catch {
    return null;
  }

  const root = rootDomain.trim().toLowerCase();
  const host = url.host.toLowerCase();
  let pathname: string;

  if (root && isWriterSubdomain(host, root)) {
    pathname = collapseWriterSubdomainPath(url.pathname);
    url.protocol = root.startsWith("localhost") ? "http:" : "https:";
    url.host = root;
  } else {
    pathname = collapseMainPath(url.pathname);
  }

  const search = keepAllowedSearch(url.searchParams);
  const redacted = `${url.protocol}//${url.host}${pathname}${search}`;

  return { ...event, url: redacted };
}
