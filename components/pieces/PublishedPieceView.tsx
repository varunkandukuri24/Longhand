import { PagesBackLink } from "@/components/dashboard/PagesBackLink";
import { VisibilityControl } from "@/components/pieces/VisibilityControl";
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
  /**
   * Back arrow for pieces on a writer's subdomain page (everyone).
   * Owner's main-domain view uses the default Pages link instead.
   */
  backLink?: { href: string; label: string };
};

export async function PublishedPieceView({
  piece,
  isOwner,
  authorHref,
  backLink,
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
      chrome={
        <>
          {backLink ? (
            <PagesBackLink
              visible
              href={backLink.href}
              label={backLink.label}
            />
          ) : isOwner ? (
            <PagesBackLink visible />
          ) : null}
          {isOwner && !backLink ? (
            <VisibilityControl
              pieceId={piece.id}
              initialVisibility={piece.visibility}
            />
          ) : null}
        </>
      }
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
        weatherNote={weatherNote}
      />
    </PaperPage>
  );
}
