import { describe, expect, it } from "vitest";
import { createEmailProvider } from "./email-provider";

describe("createEmailProvider", () => {
  it("uses Resend when AUTH_RESEND_KEY is set", () => {
    const provider = createEmailProvider({
      AUTH_RESEND_KEY: "re_test",
      EMAIL_FROM: "Longhand <noreply@example.com>",
    });
    expect(provider.id).toBe("resend");
    expect(provider.type).toBe("email");
  });

  it("uses Nodemailer when only EMAIL_SERVER is set", () => {
    const provider = createEmailProvider({
      EMAIL_SERVER: "smtp://localhost:1025",
      EMAIL_FROM: "Longhand <noreply@localhost>",
    });
    expect(provider.id).toBe("nodemailer");
    expect(provider.type).toBe("email");
  });

  it("does not throw when neither mail backend is set", () => {
    const provider = createEmailProvider({});
    expect(provider.id).toBe("nodemailer");
    expect(provider.type).toBe("email");
    expect(provider.sendVerificationRequest).toBeTypeOf("function");
  });
});
