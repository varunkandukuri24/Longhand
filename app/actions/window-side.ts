"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { WindowSide } from "@/lib/scene";
import { eq } from "drizzle-orm";

export async function saveWindowSide(side: WindowSide): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    return;
  }
  if (side !== "left" && side !== "right") {
    return;
  }
  await db
    .update(users)
    .set({ windowSide: side })
    .where(eq(users.id, session.user.id));
}
