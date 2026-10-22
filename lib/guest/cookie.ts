import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { sha256HexNode } from "@/lib/receipt/sha256-node";
import { GUEST_TTL_MS } from "./limits";

export const GUEST_COOKIE = "lh_guest";

export function guestCookieOptions(): {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    secure: process.env.AUTH_URL?.startsWith("https://") === true,
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(GUEST_TTL_MS / 1000),
  };
}

export function generateGuestToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashGuestToken(token: string): string {
  return sha256HexNode(token);
}

export async function readGuestCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value ?? null;
}

export async function setGuestCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(GUEST_COOKIE, token, guestCookieOptions());
}

export async function clearGuestCookie(): Promise<void> {
  const store = await cookies();
  store.delete(GUEST_COOKIE);
}
