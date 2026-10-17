import { FocusEditor } from "@/components/editor/FocusEditor";
import { db } from "@/db";
import { pieces } from "@/db/schema";
import { requireUserWithDisplayName } from "@/lib/auth/display-name";
import { isPieceId } from "@/lib/pieces/piece-id";
import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

export default async function WritePage({
  params,
}: PageProps<"/write/[pieceId]">) {
  const user = await requireUserWithDisplayName();

  const { pieceId } = await params;
  if (!isPieceId(pieceId)) {
    notFound();
  }

  const [piece] = await db
    .select({
      id: pieces.id,
      status: pieces.status,
      slug: pieces.slug,
      title: pieces.title,
    })
    .from(pieces)
    .where(and(eq(pieces.id, pieceId), eq(pieces.userId, user.id)))
    .limit(1);

  if (!piece) {
    notFound();
  }

  if (piece.status === "published" && piece.slug) {
    redirect(`/p/${piece.slug}`);
  }

  return (
    <FocusEditor
      pieceId={piece.id}
      initialTitle={piece.title}
      writerHandle={user.handle}
      initialWindowSide={user.windowSide}
      initialFont={user.font}
      initialFontSize={user.fontSize}
    />
  );
}
