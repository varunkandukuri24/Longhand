import { describe, expect, it } from "vitest";
import {
  fetchSourceMeta,
  hostnameFromUrl,
  parseSafeUrl,
  type SourceFetchDeps,
} from "./fetch-source";
import { parseSourceMeta } from "./parse-meta";

describe("parseSafeUrl refuses private targets", () => {
  it("refuses localhost hostname", () => {
    expect(() => parseSafeUrl("http://localhost/")).toThrow();
    expect(hostnameFromUrl("http://localhost/path")).toBe("localhost");
  });

  it("refuses 127.0.0.1", () => {
    expect(() => parseSafeUrl("http://127.0.0.1/")).toThrow();
  });

  it("refuses 10.x addresses", () => {
    expect(() => parseSafeUrl("http://10.0.0.5/")).toThrow();
  });

  it("refuses 169.254.x addresses", () => {
    expect(() => parseSafeUrl("http://169.254.169.254/")).toThrow();
  });

  it("refuses 192.168.x addresses", () => {
    expect(() => parseSafeUrl("http://192.168.1.10/")).toThrow();
  });
});

describe("fetchSourceMeta", () => {
  it("refuses a redirect to a private IP", async () => {
    const deps: SourceFetchDeps = {
      resolveHostname: async () => "93.184.216.34",
      request: async () => ({
        statusCode: 302,
        headers: { location: "http://10.0.0.1/secret" },
        body: "",
      }),
    };

    const result = await fetchSourceMeta(
      "https://example.com/article",
      deps,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("refused");
      expect(result.hostname).toBe("example.com");
    }
  });

  it("refuses when resolved IP is private", async () => {
    const result = await fetchSourceMeta("https://example.com/", {
      resolveHostname: async () => "192.168.0.20",
      request: async () => {
        throw new Error("should not connect");
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("refused");
    }
  });

  it("falls back to the hostname when fetch fails", async () => {
    const result = await fetchSourceMeta("https://Example.COM/post", {
      resolveHostname: async () => "93.184.216.34",
      request: async () => {
        throw new Error("ECONNREFUSED");
      },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("fetch_failed");
      expect(result.hostname).toBe("example.com");
    }
  });

  it("returns og title and site on success", async () => {
    const result = await fetchSourceMeta("https://news.example/a", {
      resolveHostname: async () => "93.184.216.34",
      request: async () => ({
        statusCode: 200,
        headers: {},
        body: `<html><head>
          <meta property="og:title" content="An Essay" />
          <meta property="og:site_name" content="News" />
        </head></html>`,
      }),
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.meta.title).toBe("An Essay");
      expect(result.meta.siteName).toBe("News");
    }
  });
});

describe("parseSourceMeta", () => {
  it("prefers og:title and og:site_name", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Hello World" />
        <meta property="og:site_name" content="Example News" />
        <title>Fallback Title</title>
      </head></html>`;
    expect(parseSourceMeta(html, "example.com")).toEqual({
      title: "Hello World",
      siteName: "Example News",
    });
  });

  it("falls back to title tag and hostname", () => {
    const html = `<html><head><title>Just Title</title></head></html>`;
    expect(parseSourceMeta(html, "example.com")).toEqual({
      title: "Just Title",
      siteName: "example.com",
    });
  });
});
