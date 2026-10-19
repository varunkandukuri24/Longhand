import { DrizzleAdapter } from "@auth/drizzle-adapter";
import NextAuth from "next-auth";
import type { EmailConfig } from "next-auth/providers";
import Nodemailer from "next-auth/providers/nodemailer";
import Resend from "next-auth/providers/resend";
import { db } from "@/db";
import {
  accounts,
  authSessions,
  users,
  verificationTokens,
} from "@/db/schema";
import { sessionCookieOptions } from "@/lib/auth/session-cookie";
import {
  allowSignInAttempt,
  clientIpFromHeaders,
} from "@/lib/auth/sign-in-rate-limit";

const useSecureCookies =
  process.env.AUTH_URL?.startsWith("https://") === true;

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
  if (process.env.AUTH_RESEND_KEY) {
    return wrapEmailProvider(
      Resend({
        apiKey: process.env.AUTH_RESEND_KEY,
        from: process.env.EMAIL_FROM,
      }),
    );
  }
  return wrapEmailProvider(
    Nodemailer({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
  );
}

const email = emailProvider();

/** Provider id for signIn() — "resend" in production, "nodemailer" locally. */
export const emailProviderId = email.id;

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: authSessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [email],
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/verify",
  },
  cookies: {
    sessionToken: sessionCookieOptions(useSecureCookies),
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
