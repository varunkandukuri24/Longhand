import { db } from "@/db";
import { pieces, receipts, users } from "@/db/schema";
import {
  formatDuration,
  sharesToPercents,
} from "@/lib/receipt/format";
import { loadGoogleFont } from "@/lib/og/fonts";
import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";

export const alt = "Longhand effort receipt";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type ImageProps = {
  params: Promise<{ slug: string }>;
};

export default async function Image({ params }: ImageProps) {
  const { slug } = await params;

  const [row] = await db
    .select({
      title: pieces.title,
      authorName: users.name,
      metrics: receipts.metrics,
    })
    .from(pieces)
    .innerJoin(receipts, eq(receipts.pieceId, pieces.id))
    .innerJoin(users, eq(users.id, pieces.userId))
    .where(eq(pieces.slug, slug))
    .limit(1);

  const title = row?.title ?? "Untitled";
  const author = row?.authorName?.trim() || "Anonymous";
  const metrics = row?.metrics;
  const active = metrics
    ? formatDuration(metrics.activeWritingTimeMs)
    : "<1 min";
  const sessions = metrics?.sessionCount ?? 0;
  const typed = metrics
    ? sharesToPercents(
        metrics.typedShare,
        metrics.pastedShare,
        metrics.quotedShare,
      ).typed
    : 0;

  const [literata, dmMono] = await Promise.all([
    loadGoogleFont("Literata", 400, "italic"),
    loadGoogleFont("DM Mono", 400, "normal"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#FFFBF2",
          color: "#2B2722",
          padding: "72px 80px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "DM Mono",
            fontSize: 22,
            letterSpacing: "0.08em",
            color: "rgba(43,39,34,0.55)",
          }}
        >
          LONGHAND
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontFamily: "Literata",
            fontSize: 64,
            fontStyle: "italic",
            lineHeight: 1.2,
            maxHeight: 180,
            overflow: "hidden",
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 16,
            fontFamily: "DM Mono",
            fontSize: 24,
            color: "rgba(43,39,34,0.55)",
          }}
        >
          {author}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            gap: 40,
            fontFamily: "DM Mono",
            fontSize: 28,
            color: "rgba(43,39,34,0.75)",
          }}
        >
          <span>{active} active</span>
          <span>
            {sessions} {sessions === 1 ? "session" : "sessions"}
          </span>
          <span>{typed}% by hand</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "Literata",
          data: literata,
          style: "italic",
          weight: 400,
        },
        {
          name: "DM Mono",
          data: dmMono,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
