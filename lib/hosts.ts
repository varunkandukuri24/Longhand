/** Apex host for the app, e.g. "localhost:3000" or "longhand.example". */
export function rootDomain(): string {
  const domain = process.env.ROOT_DOMAIN?.trim();
  if (!domain) {
    throw new Error("ROOT_DOMAIN is not set");
  }
  return domain;
}

export function siteProtocol(): "http" | "https" {
  const domain = rootDomain();
  if (domain.startsWith("localhost") || domain.startsWith("127.0.0.1")) {
    return "http";
  }
  return "https";
}

export function mainOrigin(): string {
  return `${siteProtocol()}://${rootDomain()}`;
}

export function writerOrigin(handle: string): string {
  return `${siteProtocol()}://${handle}.${rootDomain()}`;
}

/** True when host is the main (or www) apex, not a writer subdomain. */
export function isMainHost(host: string): boolean {
  const root = rootDomain();
  return host === root || host === `www.${root}`;
}

/**
 * If host is `{handle}.{ROOT_DOMAIN}`, return the handle; otherwise null.
 * Rejects empty labels and multi-level subdomains.
 */
export function subdomainHandle(host: string): string | null {
  const root = rootDomain();
  const suffix = `.${root}`;
  if (!host.endsWith(suffix)) {
    return null;
  }
  const handle = host.slice(0, -suffix.length);
  if (!handle || handle.includes(".")) {
    return null;
  }
  return handle;
}
