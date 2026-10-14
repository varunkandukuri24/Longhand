import { ReplayPlayer } from "@/components/receipt/ReplayPlayer";
import { VerifyLine } from "@/components/receipt/VerifyLine";
import { LibraryCard } from "@/components/receipt/LibraryCard";
import { ResponseLine } from "@/components/source/ResponseLine";
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
      replayPublic: pieces.replayPublic,
      mode: pieces.mode,
      sourceUrl: pieces.sourceUrl,
      sourceTitle: pieces.sourceTitle,
      sourceSite: pieces.sourceSite,
      slug: pieces.slug,
      authorName: users.name,
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
    row.finalTextHash === null ||
    row.slug === null
  ) {
    return null;
  }

  return {
    ...row,
    finalText: row.finalText,
    publishedAt: row.publishedAt,
    finalTextHash: row.finalTextHash,
    slug: row.slug,
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
  const author = piece.authorName?.trim();
  return {
    title: `${piece.title} · Longhand`,
    description: author ? `${author} · Effort receipt` : "Effort receipt",
  };
}

export default async function PublicPiecePage({ params }: PageProps) {
  const { slug } = await params;
  const piece = await loadPublished(slug);
  if (!piece) {
    notFound();
  }

  // Public surfaces show only display_name — never email or its prefix.
  const author = piece.authorName?.trim() || "Anonymous";

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

  return (
    <main className="flex min-h-screen flex-col items-center px-4 py-10">
      <article className="w-full max-w-[820px] rounded-[6px] bg-page px-12 py-10 shadow-page">
        {source ? (
          <div className="mb-4">
            <ResponseLine
              title={source.title}
              site={source.site}
              url={source.url}
            />
          </div>
        ) : null}
        <h1 className="font-writing text-[30px] leading-snug text-ink">
          {piece.title}
        </h1>
        <div className="mt-6 whitespace-pre-wrap font-writing text-[21px] leading-[1.75] text-ink">
          {piece.finalText}
        </div>
      </article>

      <div className="mt-8 w-full max-w-[440px]">
        <LibraryCard
          pieceId={piece.id}
          title={piece.title}
          author={author}
          publishedAt={piece.publishedAt}
          metrics={piece.metrics}
          responseTitle={source?.title ?? null}
          responseUrl={source?.url ?? null}
        />
        <div className="mt-6">
          <VerifyLine
            finalTextHash={piece.finalTextHash}
            chainHeadHash={piece.chainHeadHash}
          />
        </div>
      </div>

      {piece.replayPublic ? (
        <div className="mt-8 w-full max-w-[820px]">
          <ReplayPlayer slug={piece.slug} />
        </div>
      ) : null}
    </main>
  );
}
