"use server";

import { db } from "@/db";
import { pieces } from "@/db/schema";
import { requireUserWithDisplayName } from "@/lib/auth/display-name";
import { redirect } from "next/navigation";

export async function createPiece() {
  const user = await requireUserWithDisplayName();

  const [piece] = await db
    .insert(pieces)
    .values({
      userId: user.id,
      title: "",
      status: "draft",
    })
    .returning({ id: pieces.id });

  redirect(`/write/${piece.id}`);
}
