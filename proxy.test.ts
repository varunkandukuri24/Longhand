import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

const ENV_KEYS = ["ROOT_DOMAIN", "VERCEL_ENV"] as const;
const saved = new Map<string, string | undefined>();

function request(host: string, path: string): NextRequest {
  return new NextRequest(new URL(`https://${host}${path}`), {
    headers: { host },
  });
}

describe("proxy", () => {
  beforeEach(() => {
    saved.clear();
    for (const key of ENV_KEYS) {
      saved.set(key, process.env[key]);
    }
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      const value = saved.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("404s /u on the production main host", () => {
    process.env.ROOT_DOMAIN = "typelonghand.com";
    delete process.env.VERCEL_ENV;
    expect(proxy(request("typelonghand.com", "/u")).status).toBe(404);
    expect(proxy(request("typelonghand.com", "/u/ada")).status).toBe(404);
    expect(proxy(request("typelonghand.com", "/")).status).toBe(200);
  });

  it("rewrites writer subdomains in production", () => {
    process.env.ROOT_DOMAIN = "typelonghand.com";
    delete process.env.VERCEL_ENV;
    const home = proxy(request("ada.typelonghand.com", "/"));
    expect(home.status).toBe(200);
    expect(home.headers.get("x-middleware-rewrite")).toContain("/u/ada");

    const piece = proxy(request("ada.typelonghand.com", "/hello"));
    expect(piece.status).toBe(200);
    expect(piece.headers.get("x-middleware-rewrite")).toContain(
      "/u/ada/hello",
    );
  });

  it("serves /u on a preview instead of 404", () => {
    delete process.env.ROOT_DOMAIN;
    process.env.VERCEL_ENV = "preview";
    expect(proxy(request("longhand-git-test.vercel.app", "/u")).status).toBe(
      200,
    );
    expect(
      proxy(request("longhand-git-test.vercel.app", "/u/ada")).status,
    ).toBe(200);
  });

  it("does not 404 /u on a preview even if ROOT_DOMAIN is set", () => {
    process.env.ROOT_DOMAIN = "typelonghand.com";
    process.env.VERCEL_ENV = "preview";
    expect(proxy(request("typelonghand.com", "/u/ada")).status).toBe(200);
  });
});
