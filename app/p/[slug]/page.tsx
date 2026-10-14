import { VerifyLine } from "@/components/receipt/VerifyLine";
import { LibraryCard } from "@/components/receipt/LibraryCard";
import { db } from "@/db";
import { pieces, receipts, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

async function loadPublished(slug: string) {
  const [row] = await db
    .select({
      id: pieces.id,
      title: pieces.title,
      finalText: pieces.finalText,
      finalTextHash: pieces.finalTextHash,
      publishedAt: pieces.publishedAt,
      authorName: users.name,
      authorEmail: users.email,
      metrics: receipts.metrics,
      chainHeadHash: receipts.chainHeadHash,
    })
    .from(pieces)
    .innerJoin(receipts, eq(receipts.pieceId, pieces.id))
    .innerJoin(users, eq(users.id, pieces.userId))
    .where(eq(pieces.slug, slug))
    .limit(1);

  if (
    !row ||
    row.finalText === null ||
    row.publishedAt === null ||
    row.finalTextHash === null
  ) {
    return null;
  }

  return {
    ...row,
    finalText: row.finalText,
    publishedAt: row.publishedAt,
    finalTextHash: row.finalTextHash,
  };
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const piece = await loadPublished(slug);
  if (!piece) {
    return { title: "Longhand" };
  }
  return {
    title: `${piece.title} · Longhand`,
    description: "Effort receipt",
  };
}

export default async function PublicPiecePage({ params }: PageProps) {
  const { slug } = await params;
  const piece = await loadPublished(slug);
  if (!piece) {
    notFound();
  }

  const author =
    piece.authorName?.trim() ||
    piece.authorEmail?.split("@")[0] ||
    "Anonymous";

  return (
    <main className="flex min-h-full flex-col items-center bg-room-night px-4 py-10">
      <article className="w-full max-w-[820px] rounded-[6px] bg-page px-12 py-10 shadow-page">
        <div className="whitespace-pre-wrap font-writing text-[21px] leading-[1.75] text-ink">
          {piece.finalText}
        </div>
      </article>

      <div className="mt-8 w-full max-w-[820px]">
        <LibraryCard
          pieceId={piece.id}
          title={piece.title}
          author={author}
          publishedAt={piece.publishedAt}
          metrics={piece.metrics}
        />
      </div>

      <div className="mt-6 w-full max-w-[820px]">
        <VerifyLine
          finalTextHash={piece.finalTextHash}
          chainHeadHash={piece.chainHeadHash}
        />
      </div>
    </main>
  );
}
