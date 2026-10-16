import { ReplayPlayer } from "@/components/receipt/ReplayPlayer";
import { VerifyLine } from "@/components/receipt/VerifyLine";
import { LibraryCard } from "@/components/receipt/LibraryCard";
import { PaperPage, PAGE_TOP_OFFSET_PX } from "@/components/scene/PaperPage";
import { ResponseLine } from "@/components/source/ResponseLine";
import { db } from "@/db";
import { eventBatches, pieces, receipts, sessions, users } from "@/db/schema";
import { formatWeatherSessionsNote, type Condition } from "@/lib/scene";
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

  const author = piece.authorName?.trim() || "Anonymous";

  const sessionRows = await db
    .select({
      sessionId: sessions.id,
      condition: sessions.condition,
    })
    .from(sessions)
    .innerJoin(eventBatches, eq(eventBatches.sessionId, sessions.id))
    .where(eq(sessions.pieceId, piece.id));

  const seen = new Set<string>();
  const conditions: Array<Condition | null> = [];
  for (const row of sessionRows) {
    if (seen.has(row.sessionId)) continue;
    seen.add(row.sessionId);
    conditions.push(row.condition);
  }
  const weatherNote = formatWeatherSessionsNote(conditions);

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
    <PaperPage topOffsetPx={PAGE_TOP_OFFSET_PX} publicPage>
      <article>
        <h1
          className="font-writing text-[32px] leading-snug text-ink"
          data-paper-heading
        >
          {piece.title}
        </h1>
        <div className="mt-6 whitespace-pre-wrap font-writing text-[22px] leading-[1.7] text-ink">
          {source ? (
            <div className="mb-4">
              <ResponseLine
                title={source.title}
                site={source.site}
                url={source.url}
              />
            </div>
          ) : null}
          {piece.finalText}
        </div>
      </article>

      <div className="mt-16 w-full max-w-[440px]">
        <LibraryCard
          pieceId={piece.id}
          title={piece.title}
          author={author}
          publishedAt={piece.publishedAt}
          metrics={piece.metrics}
          responseTitle={source?.title ?? null}
          responseUrl={source?.url ?? null}
          weatherNote={weatherNote}
        />
        <div className="mt-6">
          <VerifyLine
            finalTextHash={piece.finalTextHash}
            chainHeadHash={piece.chainHeadHash}
          />
        </div>
      </div>

      {piece.replayPublic ? (
        <div className="mt-8 w-full">
          <ReplayPlayer slug={piece.slug} />
        </div>
      ) : null}
    </PaperPage>
  );
}
