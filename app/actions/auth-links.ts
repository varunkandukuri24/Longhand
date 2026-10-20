"use server";

import { signIn, signOut } from "@/auth";

export async function connectGoogle() {
  await signIn("google", { redirectTo: "/" });
}

export async function signOutToSignIn() {
  await signOut({ redirectTo: "/signin" });
}
