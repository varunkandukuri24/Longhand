import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("GET / guest home", () => {
  it("looks up a guest piece and never creates one on load", () => {
    const src = readFileSync(join(process.cwd(), "app/page.tsx"), "utf8");
    expect(src).toContain("getGuest");
    expect(src).toContain("getGuestPiece");
    expect(src).toContain('mode="guest"');
    expect(src).not.toContain("createOrGetGuestPiece");
    expect(src).not.toContain("/api/guest/pieces");
  });

  it("the editor has no title input", () => {
    const editor = readFileSync(
      join(process.cwd(), "components/editor/FocusEditor.tsx"),
      "utf8",
    );
    expect(editor).not.toContain("writing-title");
    expect(editor).not.toContain('aria-label="Title"');
    expect(editor).toContain('mode: "guest" | "writer"');
  });

  it("does not put the IP-limit message in the bottom bar", () => {
    const editor = readFileSync(
      join(process.cwd(), "components/editor/FocusEditor.tsx"),
      "utf8",
    );
    expect(editor).not.toContain(
      "Too many new pages from this network today. Sign in to keep writing.",
    );
    expect(editor).toContain('setSignInReason("create_limit")');
  });

  it("the IP-limit dialog uses Sign in to keep writing", () => {
    const dialog = readFileSync(
      join(process.cwd(), "components/editor/GuestSignInDialog.tsx"),
      "utf8",
    );
    expect(dialog).toContain("Sign in to keep writing");
    expect(dialog).toContain(
      "Too many new pages have been started from this network today. Sign in and you can write as much as you like.",
    );
  });
});
