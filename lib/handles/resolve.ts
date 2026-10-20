import { db } from "@/db";
import { handleRedirects, users } from "@/db/schema";
import { and, eq, gt } from "drizzle-orm";

export type ResolvedHandle =
  | {
      kind: "user";
      id: string;
      handle: string;
      name: string | null;
      createdAt: Date;
    }
  | { kind: "redirect"; handle: string }
  | { kind: "missing" };

/** Resolve a live handle, or an unexpired redirect to the new handle. */
export async function resolveHandle(handle: string): Promise<ResolvedHandle> {
  const [user] = await db
    .select({
      id: users.id,
      handle: users.handle,
      name: users.name,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.handle, handle))
    .limit(1);

  if (user?.handle) {
    return {
      kind: "user",
      id: user.id,
      handle: user.handle,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  const [redir] = await db
    .select({
      userId: handleRedirects.userId,
    })
    .from(handleRedirects)
    .where(
      and(
        eq(handleRedirects.oldHandle, handle),
        gt(handleRedirects.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!redir) {
    return { kind: "missing" };
  }

  const [next] = await db
    .select({ handle: users.handle })
    .from(users)
    .where(eq(users.id, redir.userId))
    .limit(1);

  if (!next?.handle) {
    return { kind: "missing" };
  }

  return { kind: "redirect", handle: next.handle };
}
