"use server";

import { auth } from "@/auth";
import { changeHandle } from "@/lib/handles/change";

export type SaveHandleState = {
  ok: boolean;
  handle?: string;
  error?: string;
};

export async function saveHandle(rawHandle: string): Promise<SaveHandleState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" };
  }

  const result = await changeHandle(session.user.id, rawHandle);
  if (!result.ok) {
    if (result.error === "unchanged") {
      return { ok: true, handle: rawHandle.toLowerCase().trim() };
    }
    return { ok: false, error: result.error };
  }
  return { ok: true, handle: result.handle };
}
