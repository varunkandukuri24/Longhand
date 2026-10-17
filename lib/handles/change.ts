import { db } from "@/db";
import { handleRedirects, users } from "@/db/schema";
import { validateHandle } from "@/lib/handles";
import { and, eq, ne } from "drizzle-orm";

const REDIRECT_DAYS = 90;

export type ChangeHandleResult =
  | { ok: true; handle: string }
  | { ok: false; error: "invalid" | "taken" | "unchanged" | "unauthorized" };

/** Change a writer's handle and record a 90-day redirect from the old one. */
export async function changeHandle(
  userId: string,
  rawHandle: string,
): Promise<ChangeHandleResult> {
  const checked = validateHandle(rawHandle);
  if (!checked.ok) {
    return { ok: false, error: "invalid" };
  }
  const handle = checked.handle;

  const [current] = await db
    .select({ handle: users.handle })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!current) {
    return { ok: false, error: "unauthorized" };
  }
  if (current.handle === handle) {
    return { ok: false, error: "unchanged" };
  }

  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.handle, handle), ne(users.id, userId)))
    .limit(1);

  if (taken) {
    return { ok: false, error: "taken" };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REDIRECT_DAYS);

  await db.transaction(async (tx) => {
    // Reclaiming a handle clears any redirect that still points at it.
    await tx
      .delete(handleRedirects)
      .where(eq(handleRedirects.oldHandle, handle));

    await tx
      .insert(handleRedirects)
      .values({
        oldHandle: current.handle,
        userId,
        expiresAt,
      })
      .onConflictDoUpdate({
        target: handleRedirects.oldHandle,
        set: { userId, expiresAt },
      });

    await tx
      .update(users)
      .set({ handle })
      .where(eq(users.id, userId));
  });

  return { ok: true, handle };
}

/** True when the handle is free (or already owned by this user). */
export async function isHandleAvailable(
  handle: string,
  exceptUserId?: string,
): Promise<boolean> {
  const checked = validateHandle(handle);
  if (!checked.ok) {
    return false;
  }

  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.handle, checked.handle))
    .limit(1);

  if (!row) {
    return true;
  }
  return exceptUserId !== undefined && row.id === exceptUserId;
}
