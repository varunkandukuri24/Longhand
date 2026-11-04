import { describe, expect, it } from "vitest";
import { redact } from "./redact";

const root = "longhand.example";

function event(url: string) {
  return { type: "pageview" as const, url };
}

describe("redact", () => {
  it("collapses /write/<id>", () => {
    const out = redact(
      event(`https://${root}/write/a1b2c3d4-e5f6-7890-abcd-ef1234567890`),
      root,
    );
    expect(out?.url).toBe(`https://${root}/write/[id]`);
  });

  it("collapses /p/<slug>", () => {
    const out = redact(event(`https://${root}/p/my-essay`), root);
    expect(out?.url).toBe(`https://${root}/p/[slug]`);
  });

  it("collapses /u/<handle>/<slug>", () => {
    const out = redact(event(`https://${root}/u/ada/my-essay`), root);
    expect(out?.url).toBe(`https://${root}/u/[handle]/[slug]`);
  });

  it("collapses /u/<handle>", () => {
    const out = redact(event(`https://${root}/u/ada`), root);
    expect(out?.url).toBe(`https://${root}/u/[handle]`);
  });

  it("rewrites writer subdomain paths onto the root host", () => {
    const piece = redact(event("https://ada.longhand.example/my-essay"), root);
    expect(piece?.url).toBe(`https://${root}/u/[handle]/[slug]`);

    const home = redact(event("https://ada.longhand.example/"), root);
    expect(home?.url).toBe(`https://${root}/u/[handle]`);
  });

  it("keeps utm_* and ref, drops other query params", () => {
    const out = redact(
      event(
        `https://${root}/write/abc?utm_source=x&ref=y&token=secret&foo=1`,
      ),
      root,
    );
    expect(out?.url).toBe(
      `https://${root}/write/[id]?utm_source=x&ref=y`,
    );
  });

  it("leaves unrelated paths alone aside from query stripping", () => {
    const out = redact(
      event(`https://${root}/privacy?session=abc`),
      root,
    );
    expect(out?.url).toBe(`https://${root}/privacy`);
  });

  it("returns null for an unparseable URL", () => {
    expect(redact(event("not a url"), root)).toBeNull();
  });
});
