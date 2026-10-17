import { db } from "@/db";
import { pieces, receipts } from "@/db/schema";
import { displayLinksFor, displayLabelFor } from "@/lib/references/display-links";
import {
  formatDuration,
  formatSittingCount,
} from "@/lib/receipt/format";
import { wordCount } from "@/lib/receipt/compute-receipt";
import { and, desc, eq } from "drizzle-orm";

export type WriterPublicPiece = {
  slug: string;
  title: string;
  excerpt: string;
  words: number;
  publishedAt: Date;
  durationLabel: string;
  sittingLabel: string;
};

export type WriterPageData = {
  name: string;
  handle: string;
  createdAt: Date;
  pieces: WriterPublicPiece[];
  totalWritingTimeMs: number;
};

/** First ~2 lines for the writer's page list: hostnames, no quote marks. */
export function writerExcerpt(
  text: string,
  links: Parameters<typeof displayLinksFor>[1],
): string {
  const displayLinks = displayLinksFor(text, links);
  let out = "";
  let cursor = 0;
  for (const link of displayLinks) {
    out += text.slice(cursor, link.start);
    out += displayLabelFor(text, link);
    cursor = link.end;
  }
  out += text.slice(cursor);
  out = out.replace(/^> /gm, "").replace(/[""''«»]/g, "");
  const lines = out.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return lines.slice(0, 2).join("\n");
}

export function formatWriterSummary(data: {
  pieceCount: number;
  totalWritingTimeMs: number;
  since: Date;
}): string {
  const piecesLabel =
    data.pieceCount === 1 ? "1 piece" : `${data.pieceCount} pieces`;
  const time = formatDuration(data.totalWritingTimeMs);
  const since = data.since.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  return `${piecesLabel} · ${time} of writing · since ${since}`;
}

export function formatWriterPieceDuration(
  activeWritingTimeMs: number,
  sittingCount: number,
): { durationLabel: string; sittingLabel: string } {
  const durationLabel = formatDuration(activeWritingTimeMs);
  if (sittingCount <= 1) {
    return { durationLabel, sittingLabel: "in 1 sitting" };
  }
  return {
    durationLabel,
    sittingLabel: `over ${formatSittingCount(sittingCount)}`,
  };
}

export async function loadWriterPublicPieces(userId: string): Promise<{
  pieces: WriterPublicPiece[];
  totalWritingTimeMs: number;
}> {
  const rows = await db
    .select({
      slug: pieces.slug,
      title: pieces.title,
      finalText: pieces.finalText,
      links: pieces.links,
      publishedAt: pieces.publishedAt,
      metrics: receipts.metrics,
    })
    .from(pieces)
    .innerJoin(receipts, eq(receipts.pieceId, pieces.id))
    .where(
      and(
        eq(pieces.userId, userId),
        eq(pieces.status, "published"),
        eq(pieces.visibility, "public"),
      ),
    )
    .orderBy(desc(pieces.publishedAt));

  let totalWritingTimeMs = 0;
  const list: WriterPublicPiece[] = [];

  for (const row of rows) {
    if (
      row.slug === null ||
      row.finalText === null ||
      row.publishedAt === null
    ) {
      continue;
    }
    totalWritingTimeMs += row.metrics.activeWritingTimeMs;
    const sittings =
      row.metrics.sittingRows?.length || row.metrics.sessionRows.length || 1;
    const { durationLabel, sittingLabel } = formatWriterPieceDuration(
      row.metrics.activeWritingTimeMs,
      sittings,
    );
    list.push({
      slug: row.slug,
      title: row.title,
      excerpt: writerExcerpt(row.finalText, row.links),
      words: wordCount(row.finalText),
      publishedAt: row.publishedAt,
      durationLabel,
      sittingLabel,
    });
  }

  return { pieces: list, totalWritingTimeMs };
}
