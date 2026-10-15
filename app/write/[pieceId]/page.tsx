import { FocusEditor } from "@/components/editor/FocusEditor";
import { db } from "@/db";
import { pieces } from "@/db/schema";
import { requireUserWithDisplayName } from "@/lib/auth/display-name";
import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";

export default async function WritePage({
  params,
}: PageProps<"/write/[pieceId]">) {
  const user = await requireUserWithDisplayName();

  const { pieceId } = await params;

  const [piece] = await db
    .select({
      id: pieces.id,
      status: pieces.status,
      slug: pieces.slug,
      title: pieces.title,
      finalText: pieces.finalText,
      mode: pieces.mode,
      sourceUrl: pieces.sourceUrl,
      sourceTitle: pieces.sourceTitle,
      sourceSite: pieces.sourceSite,
    })
    .from(pieces)
    .where(and(eq(pieces.id, pieceId), eq(pieces.userId, user.id)))
    .limit(1);

  if (!piece) {
    notFound();
  }

  const source =
    piece.mode === "response" &&
    piece.sourceUrl &&
    piece.sourceTitle &&
    piece.sourceSite
      ? {
          url: piece.sourceUrl,
          title: piece.sourceTitle,
          site: piece.sourceSite,
        }
      : null;

  if (piece.status === "published" && piece.slug) {
    return (
      <FocusEditor
        pieceId={piece.id}
        source={source}
        initialWindowSide={user.windowSide}
        published={{
          slug: piece.slug,
          title: piece.title,
          finalText: piece.finalText ?? "",
        }}
      />
    );
  }

  return (
    <FocusEditor
      pieceId={piece.id}
      initialTitle={piece.title}
      source={source}
      initialWindowSide={user.windowSide}
    />
  );
}
