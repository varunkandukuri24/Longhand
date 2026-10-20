import { Seal } from "@/components/receipt/Seal";
import { PaperPage, PAGE_TOP_OFFSET_PX } from "@/components/scene/PaperPage";
import { WriteOnLonghandLink } from "@/components/writers/WriteOnLonghandLink";
import { resolveHandle } from "@/lib/handles/resolve";
import { mainOrigin, writerOrigin } from "@/lib/hosts";
import {
  formatWriterSummary,
  loadWriterPublicPieces,
} from "@/lib/writers/page-data";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";

type PageProps = {
  params: Promise<{ handle: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { handle } = await params;
  const resolved = await resolveHandle(handle);
  if (resolved.kind !== "user") {
    return { title: "Longhand" };
  }
  const name = resolved.name?.trim() || resolved.handle;
  const { pieces, totalWritingTimeMs } = await loadWriterPublicPieces(
    resolved.id,
  );
  const description =
    pieces.length === 0
      ? `${name} on Longhand`
      : formatWriterSummary({
          pieceCount: pieces.length,
          totalWritingTimeMs,
          since: resolved.createdAt,
        });
  return {
    title: `${name} · Longhand`,
    description,
  };
}

export default async function WriterPage({ params }: PageProps) {
  const { handle } = await params;
  const resolved = await resolveHandle(handle);

  if (resolved.kind === "redirect") {
    permanentRedirect(writerOrigin(resolved.handle));
  }
  if (resolved.kind === "missing") {
    notFound();
  }

  const name = resolved.name?.trim() || resolved.handle;
  const { pieces, totalWritingTimeMs } = await loadWriterPublicPieces(
    resolved.id,
  );
  const empty = pieces.length === 0;
  const summary = empty
    ? null
    : formatWriterSummary({
        pieceCount: pieces.length,
        totalWritingTimeMs,
        since: resolved.createdAt,
      });

  return (
    <PaperPage
      topOffsetPx={PAGE_TOP_OFFSET_PX}
      publicPage
      chrome={<WriteOnLonghandLink href={`${mainOrigin()}/`} />}
    >
      <h1
        className="font-writing text-[40px] leading-[1.15] text-ink"
        data-paper-heading
      >
        {name}
      </h1>

      {empty ? (
        <p className="mt-3 font-writing text-[17px] text-[#5C564C]">
          Nothing published here yet.
        </p>
      ) : (
        <>
          <p className="mt-3 font-ui text-[13px] text-label">{summary}</p>
          <ul className="mt-12 flex flex-col gap-9">
            {pieces.map((piece) => (
              <li key={piece.slug}>
                <Link href={`/${piece.slug}`} className="group block">
                  <h2 className="font-writing text-2xl leading-[1.3] text-ink group-hover:underline group-hover:underline-offset-2">
                    {piece.title}
                  </h2>
                  {piece.excerpt ? (
                    <p className="mt-1 line-clamp-2 whitespace-pre-line font-writing text-[16.5px] leading-[1.6] text-[#5C564C]">
                      {piece.excerpt}
                    </p>
                  ) : null}
                  <p className="mt-1 font-ui text-[12.5px] text-label">
                    {piece.publishedAt.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    <span className="mx-2 text-label/40">·</span>
                    {piece.words} {piece.words === 1 ? "word" : "words"}
                    <span className="mx-2 text-label/40">·</span>
                    {piece.durationLabel} {piece.sittingLabel}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="mt-[72px]">
        <div className="h-px w-[72px] bg-ink" aria-hidden />
        <div className="mt-[22px] flex items-center gap-3">
          <Seal size={22} />
          <p className="font-ui text-[12px] text-label">
            Every piece here was written on{" "}
            <a
              href={mainOrigin()}
              className="underline decoration-[#BDB6AA] underline-offset-4 hover:decoration-ink"
            >
              Longhand
            </a>
            , with a record of how.
          </p>
        </div>
        <p className="mt-4 font-ui text-[12px] text-label">
          <a
            href={`${mainOrigin()}/privacy`}
            className="underline decoration-[#BDB6AA] underline-offset-4 hover:decoration-ink"
          >
            Privacy
          </a>
        </p>
      </div>
    </PaperPage>
  );
}
