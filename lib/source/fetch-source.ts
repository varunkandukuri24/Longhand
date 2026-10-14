import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import { parseSourceMeta } from "./parse-meta";
import { isBlockedHostname, isPrivateOrInternalIp } from "./private-ip";

export const SOURCE_FETCH_TIMEOUT_MS = 5_000;
export const SOURCE_FETCH_MAX_BYTES = 1_048_576; // 1 MB
export const SOURCE_FETCH_MAX_REDIRECTS = 3;
export const SOURCE_USER_AGENT = "Longhand/1.0";

export type SourceMeta = {
  url: string;
  title: string;
  siteName: string;
};

export type FetchSourceResult =
  | { ok: true; meta: SourceMeta }
  | { ok: false; reason: "refused" | "fetch_failed"; hostname: string };

export type SourceFetchDeps = {
  resolveHostname: (hostname: string) => Promise<string>;
  request: (
    url: URL,
    ip: string,
  ) => Promise<{
    statusCode: number;
    headers: { location?: string };
    body: string;
  }>;
};

/**
 * Safely fetch only title and site name for a response-mode URL.
 * Refuses localhost, private, link-local and internal addresses
 * (checked after DNS and again after each redirect).
 */
export async function fetchSourceMeta(
  rawUrl: string,
  deps: SourceFetchDeps = defaultDeps,
): Promise<FetchSourceResult> {
  let current: URL;
  try {
    current = parseSafeUrl(rawUrl);
  } catch {
    return fallbackFailure(rawUrl, "refused");
  }

  const hostnameForFallback = current.hostname;

  try {
    for (let redirect = 0; redirect <= SOURCE_FETCH_MAX_REDIRECTS; redirect += 1) {
      const ip = await deps.resolveHostname(current.hostname);
      if (isPrivateOrInternalIp(ip)) {
        throw new SourceRefusedError("ip");
      }

      const response = await deps.request(current, ip);

      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        if (redirect === SOURCE_FETCH_MAX_REDIRECTS) {
          return {
            ok: false,
            reason: "fetch_failed",
            hostname: hostnameForFallback,
          };
        }
        try {
          current = parseSafeUrl(
            new URL(response.headers.location, current).toString(),
          );
        } catch {
          return {
            ok: false,
            reason: "refused",
            hostname: hostnameForFallback,
          };
        }
        continue;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        return {
          ok: false,
          reason: "fetch_failed",
          hostname: hostnameForFallback,
        };
      }

      const { title, siteName } = parseSourceMeta(
        response.body,
        current.hostname,
      );
      return {
        ok: true,
        meta: {
          url: current.toString(),
          title,
          siteName,
        },
      };
    }

    return { ok: false, reason: "fetch_failed", hostname: hostnameForFallback };
  } catch (err) {
    const reason =
      err instanceof SourceRefusedError ? "refused" : "fetch_failed";
    return { ok: false, reason, hostname: hostnameForFallback };
  }
}

/** Hostname to use as editable title when fetch fails. */
export function hostnameFromUrl(rawUrl: string): string {
  try {
    return parseSafeUrl(rawUrl).hostname;
  } catch {
    try {
      const url = new URL(rawUrl.includes("://") ? rawUrl : `https://${rawUrl}`);
      return url.hostname || "source";
    } catch {
      return "source";
    }
  }
}

/**
 * Parse and refuse unsafe URLs (scheme, localhost, literal private IPs).
 * Exported for focused unit tests.
 */
export function parseSafeUrl(rawUrl: string): URL {
  const trimmed = rawUrl.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SourceRefusedError("protocol");
  }
  if (!url.hostname) {
    throw new SourceRefusedError("hostname");
  }
  if (isBlockedHostname(url.hostname)) {
    throw new SourceRefusedError("hostname");
  }
  if (isIP(url.hostname) && isPrivateOrInternalIp(url.hostname)) {
    throw new SourceRefusedError("ip");
  }
  return url;
}

class SourceRefusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceRefusedError";
  }
}

function fallbackFailure(
  rawUrl: string,
  reason: "refused" | "fetch_failed",
): FetchSourceResult {
  return { ok: false, reason, hostname: hostnameFromUrl(rawUrl) };
}

async function resolveHostnameDefault(hostname: string): Promise<string> {
  if (isBlockedHostname(hostname)) {
    throw new SourceRefusedError("hostname");
  }
  if (isIP(hostname)) {
    if (isPrivateOrInternalIp(hostname)) {
      throw new SourceRefusedError("ip");
    }
    return hostname;
  }

  const results = await lookup(hostname, { all: true, verbatim: true });
  if (results.length === 0) {
    throw new Error("dns");
  }
  for (const result of results) {
    if (isPrivateOrInternalIp(result.address)) {
      throw new SourceRefusedError("ip");
    }
  }
  return results[0]!.address;
}

async function requestPinnedDefault(
  url: URL,
  ip: string,
): Promise<{
  statusCode: number;
  headers: { location?: string };
  body: string;
}> {
  const lib = url.protocol === "https:" ? https : http;
  const port =
    url.port !== ""
      ? Number(url.port)
      : url.protocol === "https:"
        ? 443
        : 80;

  const incoming = await new Promise<http.IncomingMessage>((resolve, reject) => {
    const req = lib.request(
      {
        host: ip,
        port,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        servername: url.hostname,
        headers: {
          Host: url.host,
          "User-Agent": SOURCE_USER_AGENT,
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        },
        timeout: SOURCE_FETCH_TIMEOUT_MS,
      },
      (res) => resolve(res),
    );

    req.setTimeout(SOURCE_FETCH_TIMEOUT_MS, () => {
      req.destroy(new Error("timeout"));
    });
    req.on("error", reject);
    req.end();
  });

  const statusCode = incoming.statusCode ?? 0;
  const locationHeader = incoming.headers.location;
  const location = Array.isArray(locationHeader)
    ? locationHeader[0]
    : locationHeader;

  if (statusCode >= 300 && statusCode < 400) {
    incoming.resume();
    return {
      statusCode,
      headers: { location },
      body: "",
    };
  }

  const body = await readBodyLimited(incoming, SOURCE_FETCH_MAX_BYTES);
  return {
    statusCode,
    headers: { location },
    body,
  };
}

function readBodyLimited(
  stream: http.IncomingMessage,
  maxBytes: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;

    stream.on("data", (chunk: Buffer | string) => {
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      total += buf.length;
      if (total > maxBytes) {
        stream.destroy();
        reject(new Error("too_large"));
        return;
      }
      chunks.push(buf);
    });
    stream.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    stream.on("error", reject);
  });
}

const defaultDeps: SourceFetchDeps = {
  resolveHostname: resolveHostnameDefault,
  request: requestPinnedDefault,
};
