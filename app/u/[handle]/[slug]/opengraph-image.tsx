import {
  formatSignatureMeta,
  formatSignatureSentence,
} from "@/lib/receipt/format";
import type { ReceiptSessionRow } from "@/lib/receipt/types";
import { dmMonoOg, literataOg } from "@/lib/og/fonts";
import { loadPublicPieceForHandle } from "@/lib/pieces/load-published";
import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

export const alt = "Longhand";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type ImageProps = {
  params: Promise<{ handle: string; slug: string }>;
};

function sittingRowsFor(metrics: {
  sittingRows?: ReceiptSessionRow[];
  sessionRows: ReceiptSessionRow[];
}): ReceiptSessionRow[] {
  if (metrics.sittingRows && metrics.sittingRows.length > 0) {
    return metrics.sittingRows;
  }
  return metrics.sessionRows;
}

export default async function Image({ params }: ImageProps) {
  const { handle, slug } = await params;
  const piece = await loadPublicPieceForHandle(handle, slug);
  if (!piece) {
    notFound();
  }

  const title = piece.title;
  const author = piece.authorName?.trim() || "Anonymous";
  const metrics = piece.metrics;

  const sentence = formatSignatureSentence(author, metrics.typedShare);
  const sittings = sittingRowsFor(metrics);
  const meta = formatSignatureMeta(
    metrics.activeWritingTimeMs,
    sittings.map((s) => s.startedAt),
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#FFFFFF",
          color: "#1C1A16",
          padding: "72px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "Literata",
            fontSize: 52,
            lineHeight: 1.25,
            maxHeight: 140,
            overflow: "hidden",
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 36,
            width: 72,
            height: 1,
            background: "#1C1A16",
          }}
        />
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontFamily: "Literata",
            fontSize: 32,
            lineHeight: 1.35,
            maxHeight: 100,
            overflow: "hidden",
          }}
        >
          {sentence}
        </div>
        {meta ? (
          <div
            style={{
              display: "flex",
              marginTop: 12,
              fontFamily: "DM Mono",
              fontSize: 24,
              color: "#736C61",
            }}
          >
            {meta}
          </div>
        ) : null}
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Literata",
          data: literataOg,
          style: "normal",
          weight: 400,
        },
        {
          name: "DM Mono",
          data: dmMonoOg,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
