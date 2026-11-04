import { describe, expect, it } from "vitest";
import { isAdminEmail, parseAdminEmails } from "./admin";

describe("admin emails", () => {
  it("parses a comma-separated list case-insensitively", () => {
    expect(parseAdminEmails("Ada@Example.com, bob@test.com ")).toEqual(
      new Set(["ada@example.com", "bob@test.com"]),
    );
  });

  it("returns false when ADMIN_EMAILS is empty", () => {
    expect(isAdminEmail("ada@example.com", "")).toBe(false);
    expect(isAdminEmail("ada@example.com", undefined)).toBe(false);
  });

  it("matches case-insensitively", () => {
    expect(isAdminEmail("Ada@Example.com", "ada@example.com")).toBe(true);
    expect(isAdminEmail("other@example.com", "ada@example.com")).toBe(false);
  });
});
