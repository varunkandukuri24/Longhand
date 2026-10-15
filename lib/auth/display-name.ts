import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";
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
  email: string | null | undefined;
  cityName: string | null;
  windowSide: "left" | "right";
}> {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const [row] = await db
    .select({
      name: users.name,
      email: users.email,
      cityName: users.cityName,
      windowSide: users.windowSide,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const name = row?.name?.trim() ?? "";
  if (!name) {
    redirect("/onboarding/name");
  }

  return {
    id: session.user.id,
    name,
    email: row?.email ?? session.user.email,
    cityName: row?.cityName?.trim() || null,
    windowSide: row?.windowSide === "right" ? "right" : "left",
  };
}

/** True when the user has a non-empty display name. */
export async function userHasDisplayName(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return Boolean(row?.name?.trim());
}
