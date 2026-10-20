import { googleEnabled } from "@/auth";
import { db } from "@/db";
import { accounts, users } from "@/db/schema";
import type { OwnerAccount } from "@/lib/account/types";
import {
  parseWritingFont,
  parseWritingSize,
} from "@/lib/editor/type-prefs";
import { rootDomain } from "@/lib/hosts";
import { writerPageUrl } from "@/lib/piece-urls";
import { and, eq } from "drizzle-orm";

/** Load account chrome props for a signed-in writer. */
export async function loadOwnerAccount(
  userId: string,
): Promise<OwnerAccount | null> {
  const [row] = await db
    .select({
      name: users.name,
      handle: users.handle,
      email: users.email,
      city: users.cityName,
      windowSide: users.windowSide,
      font: users.font,
      fontSize: users.fontSize,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row?.name?.trim() || !row.handle?.trim()) {
    return null;
  }

  const [google] = await db
    .select({ provider: accounts.provider })
    .from(accounts)
    .where(
      and(eq(accounts.userId, userId), eq(accounts.provider, "google")),
    )
    .limit(1);

  const domain = rootDomain();
  return {
    displayName: row.name.trim(),
    handle: row.handle,
    email: row.email ?? "",
    cityName: row.city?.trim() || null,
    windowSide: row.windowSide === "right" ? "right" : "left",
    font: parseWritingFont(row.font),
    fontSize: parseWritingSize(row.fontSize),
    googleLinked: Boolean(google),
    googleEnabled,
    domain,
    writerPageHref: writerPageUrl(row.handle),
  };
}
