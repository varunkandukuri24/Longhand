import { resolveHandle } from "@/lib/handles/resolve";
import { dmMonoOg, literataOg } from "@/lib/og/fonts";
import {
  formatWriterSummary,
  loadWriterPublicPieces,
} from "@/lib/writers/page-data";
import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";

export const alt = "Longhand";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type ImageProps = {
  params: Promise<{ handle: string }>;
};

export default async function Image({ params }: ImageProps) {
  const { handle } = await params;
  const resolved = await resolveHandle(handle);
  if (resolved.kind !== "user") {
    notFound();
  }

  const name = resolved.name?.trim() || resolved.handle;
  const { pieces, totalWritingTimeMs } = await loadWriterPublicPieces(
    resolved.id,
  );
  const summary =
    pieces.length === 0
      ? "Nothing published here yet."
      : formatWriterSummary({
          pieceCount: pieces.length,
          totalWritingTimeMs,
          since: resolved.createdAt,
        });

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
            fontSize: 64,
            lineHeight: 1.15,
            maxHeight: 160,
            overflow: "hidden",
          }}
        >
          {name}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontFamily: "DM Mono",
            fontSize: 28,
            color: "#736C61",
            maxHeight: 80,
            overflow: "hidden",
          }}
        >
          {summary}
        </div>
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
