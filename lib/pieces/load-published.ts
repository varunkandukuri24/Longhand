import { db } from "@/db";
import { pieces, receipts, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export type PublishedPiece = {
  id: string;
  userId: string;
  title: string;
  finalText: string;
  finalTextHash: string;
  links: typeof pieces.$inferSelect.links;
  publishedAt: Date;
  slug: string;
  visibility: "public" | "private";
  authorName: string | null;
  authorHandle: string;
  metrics: typeof receipts.$inferSelect.metrics;
  chainHeadHash: string;
};

async function mapRow(
  row: {
    id: string;
    userId: string;
    title: string;
    finalText: string | null;
    finalTextHash: string | null;
    links: typeof pieces.$inferSelect.links;
    publishedAt: Date | null;
    slug: string | null;
    visibility: "public" | "private";
    authorName: string | null;
    authorHandle: string | null;
    metrics: typeof receipts.$inferSelect.metrics;
    chainHeadHash: string;
  } | undefined,
): Promise<PublishedPiece | null> {
  if (
    !row ||
    row.finalText === null ||
    row.publishedAt === null ||
    row.finalTextHash === null ||
    row.slug === null ||
    !row.authorHandle
  ) {
    return null;
  }

  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    finalText: row.finalText,
    finalTextHash: row.finalTextHash,
    links: row.links,
    publishedAt: row.publishedAt,
    slug: row.slug,
    visibility: row.visibility,
    authorName: row.authorName,
    authorHandle: row.authorHandle,
    metrics: row.metrics,
    chainHeadHash: row.chainHeadHash,
  };
}

const publishedSelect = {
  id: pieces.id,
  userId: pieces.userId,
  title: pieces.title,
  finalText: pieces.finalText,
  finalTextHash: pieces.finalTextHash,
  links: pieces.links,
  publishedAt: pieces.publishedAt,
  slug: pieces.slug,
  visibility: pieces.visibility,
  authorName: users.name,
  authorHandle: users.handle,
  metrics: receipts.metrics,
  chainHeadHash: receipts.chainHeadHash,
};

/** Load any published piece by slug (public or private). */
export async function loadPublishedBySlug(
  slug: string,
): Promise<PublishedPiece | null> {
  const [row] = await db
    .select(publishedSelect)
    .from(pieces)
    .innerJoin(receipts, eq(receipts.pieceId, pieces.id))
    .innerJoin(users, eq(users.id, pieces.userId))
    .where(and(eq(pieces.slug, slug), eq(pieces.status, "published")))
    .limit(1);

  return mapRow(row);
}

/**
 * Load a public published piece for a writer's subdomain page.
 * Private, draft, or another writer's piece → null (404).
 */
export async function loadPublicPieceForHandle(
  handle: string,
  slug: string,
): Promise<PublishedPiece | null> {
  const [row] = await db
    .select(publishedSelect)
    .from(pieces)
    .innerJoin(receipts, eq(receipts.pieceId, pieces.id))
    .innerJoin(users, eq(users.id, pieces.userId))
    .where(
      and(
        eq(pieces.slug, slug),
        eq(pieces.status, "published"),
        eq(pieces.visibility, "public"),
        eq(users.handle, handle),
      ),
    )
    .limit(1);

  return mapRow(row);
}
