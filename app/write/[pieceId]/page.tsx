import { FocusEditor } from "@/components/editor/FocusEditor";
import { auth } from "@/auth";
import { db } from "@/db";
import { pieces } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

export default async function WritePage({
  params,
}: PageProps<"/write/[pieceId]">) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const { pieceId } = await params;

  const [piece] = await db
    .select({ id: pieces.id })
    .from(pieces)
    .where(and(eq(pieces.id, pieceId), eq(pieces.userId, session.user.id)))
    .limit(1);

  if (!piece) {
    notFound();
  }

  return <FocusEditor pieceId={piece.id} />;
}
