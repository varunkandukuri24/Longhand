/**
 * Map a Google OAuth profile to the Auth.js user fields we keep.
 * Deliberately omits `picture` — the account icon uses the initial.
 */
export function googleProfile(profile: {
  sub: string;
  name?: string | null;
  email?: string | null;
  email_verified?: boolean;
  picture?: string | null;
}) {
  return {
    id: profile.sub,
    name: profile.name ?? null,
    email: profile.email ?? null,
    emailVerified: profile.email_verified ? new Date() : null,
  };
}
