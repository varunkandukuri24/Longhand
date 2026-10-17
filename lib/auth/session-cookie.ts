import type { CookieOption } from "@auth/core/types";

/**
 * Host-only session cookie options. Never set `domain`, so the cookie stays
 * on the main host and is not sent to writer subdomains.
 */
export function sessionCookieOptions(secure: boolean): CookieOption {
  return {
    name: `${secure ? "__Secure-" : ""}authjs.session-token`,
    options: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
    },
  };
}
