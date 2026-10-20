import { describe, expect, it } from "vitest";
import { googleProfile } from "./google-profile";

describe("googleProfile", () => {
  it("drops the picture and keeps id, name, email, emailVerified", () => {
    const result = googleProfile({
      sub: "google-sub-1",
      name: "Ada Lovelace",
      email: "ada@example.test",
      email_verified: true,
      picture: "https://lh3.googleusercontent.com/a/photo",
    });
    expect(result).toEqual({
      id: "google-sub-1",
      name: "Ada Lovelace",
      email: "ada@example.test",
      emailVerified: expect.any(Date),
    });
    expect(result).not.toHaveProperty("picture");
    expect(result).not.toHaveProperty("image");
  });

  it("sets emailVerified null when Google has not verified the email", () => {
    const result = googleProfile({
      sub: "x",
      name: "X",
      email: "x@example.test",
      email_verified: false,
      picture: "https://example.test/p.png",
    });
    expect(result.emailVerified).toBeNull();
  });
});
