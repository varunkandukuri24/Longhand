import type { EmailConfig } from "next-auth/providers";
import Nodemailer from "next-auth/providers/nodemailer";
import Resend from "next-auth/providers/resend";

export type EmailProviderEnv = {
  AUTH_RESEND_KEY?: string;
  EMAIL_SERVER?: string;
  EMAIL_FROM?: string;
};

/**
 * Pick the Auth.js email provider from env.
 * Nodemailer throws at import if `server` is missing, which breaks `next build`
 * on Vercel when AUTH_RESEND_KEY is not in the build environment.
 */
export function createEmailProvider(env: EmailProviderEnv): EmailConfig {
  const resendKey = env.AUTH_RESEND_KEY?.trim();
  const smtp = env.EMAIL_SERVER?.trim();
  const from = env.EMAIL_FROM?.trim();

  if (resendKey) {
    return Resend({ apiKey: resendKey, from });
  }
  if (smtp) {
    return Nodemailer({ server: smtp, from });
  }
  return {
    id: "nodemailer",
    type: "email",
    name: "Email",
    from: from || "noreply@localhost",
    maxAge: 24 * 60 * 60,
    async sendVerificationRequest() {
      throw new Error(
        "Email is not configured. Set AUTH_RESEND_KEY or EMAIL_SERVER.",
      );
    },
  };
}
