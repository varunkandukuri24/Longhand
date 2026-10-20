import { PublishedPieceView } from "@/components/pieces/PublishedPieceView";
import { auth } from "@/auth";
import { loadOwnerAccount } from "@/lib/account/owner-account";
import { writerPageUrl, publicUrl } from "@/lib/piece-urls";
import { loadPublishedBySlug } from "@/lib/pieces/load-published";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const piece = await loadPublishedBySlug(slug);
  if (!piece) {
    return { title: "Longhand" };
  }
  const author = piece.authorName?.trim();
  const meta: Metadata = {
    title: `${piece.title} · Longhand`,
    description: author ? `${author} · Longhand` : "Longhand",
  };
  if (piece.visibility === "private") {
    meta.robots = { index: false, follow: false };
  }
  return meta;
}

export default async function PublicPiecePage({ params }: PageProps) {
  const { slug } = await params;
  const piece = await loadPublishedBySlug(slug);
  if (!piece) {
    notFound();
  }

  const session = await auth();
  const isOwner = session?.user?.id === piece.userId;

  if (piece.visibility === "public" && !isOwner) {
    permanentRedirect(publicUrl(piece, piece.authorHandle));
  }

  const ownerAccount =
    isOwner && session?.user?.id
      ? await loadOwnerAccount(session.user.id)
      : null;

  return (
    <PublishedPieceView
      piece={piece}
      isOwner={isOwner}
      ownerAccount={ownerAccount ?? undefined}
      authorHref={
        piece.visibility === "public"
          ? writerPageUrl(piece.authorHandle)
          : undefined
      }
    />
  );
}
