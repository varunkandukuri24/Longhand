/** True when this process is a Vercel preview deployment. */
export function isPreview(): boolean {
  return process.env.VERCEL_ENV === "preview";
}

/** Apex host for the app, e.g. "localhost:3000" or "longhand.example". */
export function rootDomain(): string {
  if (typeof window !== "undefined") {
    throw new Error(
      "rootDomain() must only run on the server; pass domain as a prop to client components",
    );
  }
  const domain = process.env.ROOT_DOMAIN?.trim();
  if (domain) {
    return domain;
  }
  if (isPreview()) {
    const preview = process.env.VERCEL_BRANCH_URL ?? process.env.VERCEL_URL;
    const host = preview?.trim();
    if (host) {
      return host;
    }
  }
  throw new Error("ROOT_DOMAIN is not set");
}

export function siteProtocol(): "http" | "https" {
  const domain = rootDomain();
  if (domain.startsWith("localhost") || domain.startsWith("127.0.0.1")) {
    return "http";
  }
  return "https";
}

/**
 * Session and guest cookies are Secure on HTTPS (production and previews),
 * not on localhost. Do not key this off AUTH_URL: previews leave it unset.
 */
export function secureCookies(): boolean {
  return siteProtocol() === "https";
}

export function mainOrigin(): string {
  return `${siteProtocol()}://${rootDomain()}`;
}

export function writerOrigin(handle: string): string {
  if (isPreview()) {
    return `${mainOrigin()}/u/${handle}`;
  }
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
