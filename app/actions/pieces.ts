"use server";

import { auth } from "@/auth";
import { db } from "@/db";
import { pieces } from "@/db/schema";
import { redirect } from "next/navigation";

export async function createPiece() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const [piece] = await db
    .insert(pieces)
    .values({
      userId: session.user.id,
      title: "",
      mode: "freewrite",
      status: "draft",
    })
    .returning({ id: pieces.id });

  redirect(`/write/${piece.id}`);
}
