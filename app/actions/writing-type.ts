"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  parseWritingFont,
  parseWritingSize,
  type WritingFont,
  type WritingSize,
} from "@/lib/editor/type-prefs";
import { eq } from "drizzle-orm";

export async function saveWritingType(args: {
  font: WritingFont;
  fontSize: WritingSize;
}): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) {
    return;
  }
  const font = parseWritingFont(args.font);
  const fontSize = parseWritingSize(args.fontSize);
  await db
    .update(users)
    .set({
      font,
      fontSize: String(fontSize) as "18" | "20" | "22" | "24",
    })
    .where(eq(users.id, session.user.id));
}
