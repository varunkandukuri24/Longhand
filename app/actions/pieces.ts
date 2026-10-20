"use server";

import { requireUserWithDisplayName } from "@/lib/auth/display-name";
import { openFreshPiece } from "@/lib/pieces/open-fresh-piece";
import { redirect } from "next/navigation";

export async function createPiece() {
  const user = await requireUserWithDisplayName();
  const pieceId = await openFreshPiece(user.id);
  redirect(`/write/${pieceId}`);
}
