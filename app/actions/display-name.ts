"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { normalizeDisplayName } from "@/lib/auth/normalize-display-name";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

export async function saveDisplayName(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const nextRaw = String(formData.get("next") ?? "").trim();
  const next =
    nextRaw.startsWith("/") && !nextRaw.startsWith("//")
      ? nextRaw
      : "/dashboard";

  const name = normalizeDisplayName(String(formData.get("name") ?? ""));
  if (!name) {
    // Do not clear an existing name; bounce back (dashboard re-prompts if unset).
    redirect(next);
  }

  await db
    .update(users)
    .set({ name })
    .where(eq(users.id, session.user.id));

  redirect(next);
}
