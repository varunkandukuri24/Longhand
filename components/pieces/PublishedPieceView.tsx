import { PagesBackLink } from "@/components/dashboard/PagesBackLink";
import { SignatureReceipt } from "@/components/receipt/SignatureReceipt";
import { PieceText } from "@/components/references/PieceText";
import { ReferencesRow } from "@/components/references/ReferencesRow";
import { PaperPage, PAGE_TOP_OFFSET_PX } from "@/components/scene/PaperPage";
import { db } from "@/db";
import { eventBatches, sessions } from "@/db/schema";
import type { PublishedPiece } from "@/lib/pieces/load-published";
import { referencesFor } from "@/lib/references";
import { displayLinksFor } from "@/lib/references/display-links";
import { formatWeatherSessionsNote, type Condition } from "@/lib/scene";
import { eq } from "drizzle-orm";

type PublishedPieceViewProps = {
  piece: PublishedPiece;
  isOwner: boolean;
  /** When set, the signature author name links to the writer's page. */
  authorHref?: string;
};

export async function PublishedPieceView({
  piece,
  isOwner,
  authorHref,
}: PublishedPieceViewProps) {
  const author = piece.authorName?.trim() || "Anonymous";
  const displayLinks = displayLinksFor(piece.finalText, piece.links);
  const references = referencesFor(piece.finalText, displayLinks);

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

  return (
    <PaperPage
      topOffsetPx={PAGE_TOP_OFFSET_PX}
      publicPage
      chrome={isOwner ? <PagesBackLink visible /> : null}
    >
      <article>
        <h1
          className="font-writing text-[32px] leading-snug text-ink"
          data-paper-heading
        >
          {piece.title}
        </h1>
        <PieceText text={piece.finalText} links={displayLinks} />
        <ReferencesRow references={references} />
      </article>

      <SignatureReceipt
        author={author}
        authorHref={authorHref}
        publishedAt={piece.publishedAt}
        metrics={piece.metrics}
        finalTextHash={piece.finalTextHash}
        chainHeadHash={piece.chainHeadHash}
        weatherNote={weatherNote}
      />
    </PaperPage>
  );
}
