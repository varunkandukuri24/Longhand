import { rootDomain, isPreview } from "@/lib/hosts";
import {
  loadPublishedBySlug,
  loadPublicPieceForHandle,
} from "@/lib/pieces/load-published";
import { privateUrl, publicUrl } from "@/lib/piece-urls";
import {
  formatSignatureMeta,
  formatSignatureSentence,
} from "@/lib/receipt/format";
import type { ReceiptSessionRow } from "@/lib/receipt/types";
import { cache } from "react";

export type ExampleSignature = {
  sentence: string;
  meta: string;
  href: string;
};

export type ParsedExampleUrl =
  | { kind: "slug"; slug: string }
  | { kind: "handle-slug"; handle: string; slug: string };

/**
 * Accept `/p/{slug}` and `{handle}.{domain}/{slug}` (with or without protocol).
 * Returns null when the URL doesn't match either shape.
 */
export function parseExamplePieceUrl(
  raw: string,
  opts: { domain: string; preview?: boolean },
): ParsedExampleUrl | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let pathname = trimmed;
  let host: string | null = null;

  try {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
      const url = new URL(trimmed);
      host = url.host;
      pathname = url.pathname;
    } else if (trimmed.startsWith("/")) {
      pathname = trimmed;
    } else {
      const slash = trimmed.indexOf("/");
      if (slash === -1) return null;
      host = trimmed.slice(0, slash);
      pathname = trimmed.slice(slash);
    }
  } catch {
    return null;
  }

  const path = pathname.replace(/\/+$/, "") || "/";
  const privateMatch = path.match(/^\/p\/([^/]+)$/);
  if (privateMatch) {
    return { kind: "slug", slug: privateMatch[1] };
  }

  if (opts.preview) {
    const previewMatch = path.match(/^\/u\/([^/]+)\/([^/]+)$/);
    if (previewMatch) {
      return {
        kind: "handle-slug",
        handle: previewMatch[1],
        slug: previewMatch[2],
      };
    }
  }

  if (host) {
    const suffix = `.${opts.domain}`;
    if (host.endsWith(suffix)) {
      const handle = host.slice(0, -suffix.length);
      if (handle && !handle.includes(".")) {
        const slugMatch = path.match(/^\/([^/]+)$/);
        if (slugMatch) {
          return {
            kind: "handle-slug",
            handle,
            slug: slugMatch[1],
          };
        }
      }
    }
  }

  return null;
}

function sittingRowsFor(metrics: {
  sittingRows?: ReceiptSessionRow[];
  sessionRows: ReceiptSessionRow[];
}): ReceiptSessionRow[] {
  if (metrics.sittingRows && metrics.sittingRows.length > 0) {
    return metrics.sittingRows;
  }
  return metrics.sessionRows;
}

async function resolveExampleSignature(): Promise<ExampleSignature | null> {
  try {
    const raw = process.env.EXAMPLE_PIECE_URL?.trim();
    if (!raw) return null;

    const domain = rootDomain();
    const preview = isPreview();
    const parsed = parseExamplePieceUrl(raw, { domain, preview });
    if (!parsed) return null;

    if (parsed.kind === "slug") {
      const piece = await loadPublishedBySlug(parsed.slug);
      if (!piece) return null;
      const author = piece.authorName?.trim() || "Anonymous";
      const sittings = sittingRowsFor(piece.metrics);
      return {
        sentence: formatSignatureSentence(author, piece.metrics.typedShare),
        meta: formatSignatureMeta(
          piece.metrics.activeWritingTimeMs,
          sittings.map((s) => s.startedAt),
        ),
        href:
          piece.visibility === "public"
            ? publicUrl(piece, piece.authorHandle)
            : privateUrl(piece),
      };
    }

    const piece = await loadPublicPieceForHandle(parsed.handle, parsed.slug);
    if (!piece) return null;
    const author = piece.authorName?.trim() || "Anonymous";
    const sittings = sittingRowsFor(piece.metrics);
    return {
      sentence: formatSignatureSentence(author, piece.metrics.typedShare),
      meta: formatSignatureMeta(
        piece.metrics.activeWritingTimeMs,
        sittings.map((s) => s.startedAt),
      ),
      href: publicUrl(piece, piece.authorHandle),
    };
  } catch {
    return null;
  }
}

/** Per-request cached example signature for the guest intro and share card. */
export const getExampleSignature = cache(resolveExampleSignature);
