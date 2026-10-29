import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import type { EmailConfig } from "next-auth/providers";
import Google from "next-auth/providers/google";
import { db } from "@/db";
import { createEmailProvider } from "@/lib/auth/email-provider";
import {
  accounts,
  authSessions,
  users,
  verificationTokens,
} from "@/db/schema";
import { sessionCookieOptions } from "@/lib/auth/session-cookie";
import { googleProfile } from "@/lib/auth/google-profile";
import {
  allowSignInAttempt,
  clientIpFromHeaders,
} from "@/lib/auth/sign-in-rate-limit";
import { isPreview, secureCookies } from "@/lib/hosts";

export { googleProfile };

function wrapEmailProvider(provider: EmailConfig): EmailConfig {
  const send = provider.sendVerificationRequest.bind(provider);
  return {
    ...provider,
    async sendVerificationRequest(params) {
      const ip = await clientIpFromHeaders();
      const allowed = await allowSignInAttempt(params.identifier, ip);
      if (!allowed) {
        // Still succeed so Auth.js shows the same "check your email" page.
        return;
      }
      await send(params);
    },
  };
}

function emailProvider(): EmailConfig {
  return wrapEmailProvider(
    createEmailProvider({
      AUTH_RESEND_KEY: process.env.AUTH_RESEND_KEY,
      EMAIL_SERVER: process.env.EMAIL_SERVER,
      EMAIL_FROM: process.env.EMAIL_FROM,
    }),
  );
}

const email = emailProvider();

/** Provider id for signIn() — "resend" in production, "nodemailer" locally. */
export const emailProviderId = email.id;

const googleId = process.env.AUTH_GOOGLE_ID?.trim();
const googleSecret = process.env.AUTH_GOOGLE_SECRET?.trim();

/** True when Google OAuth credentials are configured. Off on Vercel previews. */
export const googleEnabled =
  Boolean(googleId && googleSecret) && !isPreview();

const google = googleEnabled
  ? Google({
      clientId: googleId!,
      clientSecret: googleSecret!,
      allowDangerousEmailAccountLinking: true,
      profile(profile) {
        return googleProfile(profile);
      },
    })
  : null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: authSessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: google ? [email, google] : [email],
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/verify",
  },
  cookies: {
    sessionToken: sessionCookieOptions(secureCookies()),
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});
