import { db } from "@/db";
import { pieces, receipts, users } from "@/db/schema";
import {
  formatDuration,
  formatSignatureSentence,
  formatSittingCount,
} from "@/lib/receipt/format";
import { applyEvents } from "@/lib/receipt/apply-events";
import { computeReceipt } from "@/lib/receipt/compute-receipt";
import { pieceUrl } from "@/lib/piece-urls";
import { shortenRemainingUrls } from "@/lib/receipt/shorten";
import { sha256HexNode } from "@/lib/receipt/sha256-node";
import { makePieceSlug } from "@/lib/receipt/slug";
import { eq } from "drizzle-orm";
import { loadReceiptBatches } from "./load-batches";

export type PieceVisibility = "public" | "private";

export type PublishInput = {
  pieceId: string;
  userId: string;
  title: string;
  finalText: string;
  visibility: PieceVisibility;
};

export type PublishSuccess = {
  ok: true;
  slug: string;
  visibility: PieceVisibility;
  url: string;
  signatureLine: string;
  finalTextHash: string;
  chainHeadHash: string;
};

export type PublishFailure = {
  ok: false;
  status: 404 | 409 | 400;
  error: string;
  reason?: string;
};

export type PublishResult = PublishSuccess | PublishFailure;

/**
 * Flush-verified publish: rebuild from stored batches, require byte-exact match
 * with finalText, shorten any remaining full URLs for storage (not the log),
 * then freeze the piece and store the receipt.
 */
export async function publishPiece(input: PublishInput): Promise<PublishResult> {
  const title = input.title.trim();
  if (title.length === 0) {
    return { ok: false, status: 400, error: "title_required" };
  }
  if (typeof input.finalText !== "string") {
    return { ok: false, status: 400, error: "invalid_body" };
  }
  if (input.visibility !== "public" && input.visibility !== "private") {
    return { ok: false, status: 400, error: "invalid_body" };
  }

  const [piece] = await db
    .select({
      id: pieces.id,
      userId: pieces.userId,
      status: pieces.status,
    })
    .from(pieces)
    .where(eq(pieces.id, input.pieceId))
    .limit(1);

  if (!piece || piece.userId !== input.userId) {
    return { ok: false, status: 404, error: "not_found" };
  }

  if (piece.status === "published") {
    return {
      ok: false,
      status: 409,
      error: "conflict",
      reason: "already_published",
    };
  }

  const [author] = await db
    .select({ name: users.name, handle: users.handle })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);

  if (!author?.handle) {
    return { ok: false, status: 404, error: "not_found" };
  }

  const { batches, chainHeadHash } = await loadReceiptBatches(input.pieceId);
  const rebuilt = applyEvents(batches.flatMap((batch) => batch.events));

  if (rebuilt.text !== input.finalText) {
    return {
      ok: false,
      status: 409,
      error: "conflict",
      reason: "text_mismatch",
    };
  }

  const published = shortenRemainingUrls(rebuilt.text, rebuilt.links);
  const finalTextHash = sha256HexNode(published.text);
  const metrics = computeReceipt(batches, rebuilt.text);
  const publishedAt = new Date();
  const visibility = input.visibility;

  const authorName = author.name?.trim() || "Anonymous";
  const sittingCount =
    metrics.sittingRows?.length || metrics.sessionRows.length || 1;
  const signatureLine = [
    formatSignatureSentence(authorName, metrics.typedShare).replace(/\.$/, ""),
    `${formatDuration(metrics.activeWritingTimeMs)} over ${formatSittingCount(sittingCount)}`,
  ].join(" · ");

  let slug = makePieceSlug(title);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      await db.transaction(async (tx) => {
        await tx
          .update(pieces)
          .set({
            title,
            status: "published",
            visibility,
            slug,
            finalText: published.text,
            finalTextHash,
            links: published.links,
            publishedAt,
            activeSessionId: null,
            updatedAt: publishedAt,
          })
          .where(eq(pieces.id, input.pieceId));

        await tx.insert(receipts).values({
          pieceId: input.pieceId,
          metrics,
          chainHeadHash,
          version: metrics.version,
          computedAt: publishedAt,
        });
      });

      return {
        ok: true,
        slug,
        visibility,
        url: pieceUrl({ slug, visibility }, author.handle),
        signatureLine,
        finalTextHash,
        chainHeadHash,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("pieces_slug") || message.includes("unique")) {
        slug = makePieceSlug(title);
        continue;
      }
      throw err;
    }
  }

  return { ok: false, status: 409, error: "conflict", reason: "slug_collision" };
}
