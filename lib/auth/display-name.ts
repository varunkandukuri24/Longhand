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
import { redirect } from "next/navigation";
export {
  DISPLAY_NAME_MAX_LEN,
  normalizeDisplayName,
} from "./normalize-display-name";

/**
 * Require a signed-in user with a display name.
 * Redirects to sign-in or the display-name prompt when missing.
 */
export async function requireUserWithDisplayName(): Promise<{
  id: string;
  name: string;
  handle: string;
  email: string | null | undefined;
  cityName: string | null;
  font: WritingFont;
  fontSize: WritingSize;
}> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const [row] = await db
    .select({
      name: users.name,
      handle: users.handle,
      email: users.email,
      cityName: users.cityName,
      font: users.font,
      fontSize: users.fontSize,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const name = row?.name?.trim() ?? "";
  if (!name) {
    redirect("/onboarding/name");
  }

  const handle = row?.handle?.trim() ?? "";
  if (!handle) {
    redirect("/onboarding/name");
  }

  return {
    id: session.user.id,
    name,
    handle,
    email: row?.email ?? session.user.email,
    cityName: row?.cityName?.trim() || null,
    font: parseWritingFont(row?.font),
    fontSize: parseWritingSize(row?.fontSize),
  };
}

/**
 * True when the user has finished first run: a display name and a page address.
 * Google users arrive with a name but no handle, so they still need onboarding.
 */
export async function userHasDisplayName(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ name: users.name, handle: users.handle })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return Boolean(row?.name?.trim() && row?.handle?.trim());
}
