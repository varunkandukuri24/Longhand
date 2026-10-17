import { mainOrigin, writerOrigin } from "@/lib/hosts";

export type PieceUrlFields = {
  slug: string;
};

/** Public piece: `{handle}.{ROOT_DOMAIN}/{slug}`. */
export function publicUrl(piece: PieceUrlFields, handle: string): string {
  return `${writerOrigin(handle)}/${piece.slug}`;
}

/** Private piece: `{ROOT_DOMAIN}/p/{slug}`. */
export function privateUrl(piece: PieceUrlFields): string {
  return `${mainOrigin()}/p/${piece.slug}`;
}

/** Writer's personal page: `{handle}.{ROOT_DOMAIN}`. */
export function writerPageUrl(handle: string): string {
  return writerOrigin(handle);
}

/** URL for a published piece given its visibility. */
export function pieceUrl(
  piece: PieceUrlFields & { visibility: "public" | "private" },
  handle: string,
): string {
  return piece.visibility === "public"
    ? publicUrl(piece, handle)
    : privateUrl(piece);
}
