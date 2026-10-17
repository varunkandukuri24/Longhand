import { PublishedPieceView } from "@/components/pieces/PublishedPieceView";
import { resolveHandle } from "@/lib/handles/resolve";
import { writerOrigin } from "@/lib/hosts";
import { writerPageUrl } from "@/lib/piece-urls";
import { loadPublicPieceForHandle } from "@/lib/pieces/load-published";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

type PageProps = {
  params: Promise<{ handle: string; slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { handle, slug } = await params;
  const resolved = await resolveHandle(handle);
  if (resolved.kind === "redirect") {
    return { title: "Longhand" };
  }
  if (resolved.kind === "missing") {
    return { title: "Longhand" };
  }
  const piece = await loadPublicPieceForHandle(handle, slug);
  if (!piece) {
    return { title: "Longhand" };
  }
  const author = piece.authorName?.trim();
  return {
    title: `${piece.title} · Longhand`,
    description: author ? `${author} · Longhand` : "Longhand",
  };
}

export default async function WriterPiecePage({ params }: PageProps) {
  const { handle, slug } = await params;
  const resolved = await resolveHandle(handle);

  if (resolved.kind === "redirect") {
    permanentRedirect(`${writerOrigin(resolved.handle)}/${slug}`);
  }
  if (resolved.kind === "missing") {
    notFound();
  }

  const piece = await loadPublicPieceForHandle(handle, slug);
  if (!piece) {
    notFound();
  }

  const displayName = piece.authorName?.trim() || piece.authorHandle;

  return (
    <PublishedPieceView
      piece={piece}
      isOwner={false}
      authorHref={writerPageUrl(piece.authorHandle)}
      backLink={{
        href: "/",
        label: `Back to ${displayName}`,
      }}
    />
  );
}
