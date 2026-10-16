"use client";

import { Seal } from "@/components/receipt/Seal";
import { CheckIcon } from "@/components/icons/LonghandIcons";
import {
  formatCompositionLegend,
  formatDuration,
  formatReceiptNotes,
  formatRevisionLine,
  formatSignatureMeta,
  formatSignatureSentence,
  formatSittingRowWhen,
  formatVerifiedCopy,
  sharesToPercents,
} from "@/lib/receipt/format";
import type { ReceiptMetrics, ReceiptSessionRow } from "@/lib/receipt/types";
import { useId, useState } from "react";

type SignatureReceiptProps = {
  author: string;
  publishedAt: Date;
  metrics: ReceiptMetrics;
  finalTextHash: string;
  chainHeadHash: string;
  responseSite?: string | null;
  weatherNote?: string | null;
  locale?: string;
};

function sittingRowsFor(metrics: ReceiptMetrics): ReceiptSessionRow[] {
  if (metrics.sittingRows && metrics.sittingRows.length > 0) {
    return metrics.sittingRows;
  }
  return metrics.sessionRows;
}

const SEGMENT_COLOR: Record<"typed" | "broughtIn" | "quoted", string> = {
  typed: "#1C1A16",
  broughtIn: "#BDB6AA",
  quoted: "#3D5A8A",
};

export function SignatureReceipt({
  author,
  publishedAt,
  metrics,
  finalTextHash,
  chainHeadHash,
  responseSite = null,
  weatherNote = null,
  locale,
}: SignatureReceiptProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [fingerprintsOpen, setFingerprintsOpen] = useState(false);
  const [copied, setCopied] = useState<"text" | "log" | null>(null);
  const detailsId = useId();

  const sittings = sittingRowsFor(metrics);
  const sentence = formatSignatureSentence(
    author,
    metrics.typedShare,
    responseSite,
  );
  const meta = formatSignatureMeta(
    metrics.activeWritingTimeMs,
    sittings.map((s) => s.startedAt),
    { locale },
  );
  const legend = formatCompositionLegend(
    metrics.typedShare,
    metrics.pastedShare,
    metrics.quotedShare,
    responseSite,
  );
  const percents = sharesToPercents(
    metrics.typedShare,
    metrics.pastedShare,
    metrics.quotedShare,
  );
  const noteLines = formatReceiptNotes(metrics);
  const notes: string[] = [
    ...(noteLines ?? []),
    ...(weatherNote ? [weatherNote] : []),
  ];
  const verified = formatVerifiedCopy(publishedAt, locale);

  async function copy(kind: "text" | "log", value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  return (
    <div className="mt-[72px] w-full">
      <div className="h-px w-[72px] bg-ink" aria-hidden />

      <div className="mt-[22px] flex items-start gap-4">
        <Seal />
        <div className="min-w-0">
          <p className="font-writing text-[19px] leading-snug text-ink">
            {sentence}
          </p>
          <p className="mt-1 font-ui text-[12.5px] text-label">{meta}</p>
        </div>
      </div>

      <div className="mt-[22px]">
        <button
          type="button"
          className="inline-flex items-center gap-[6px] font-ui text-[12.5px] text-label transition-colors hover:text-ink"
          aria-expanded={detailsOpen}
          aria-controls={detailsId}
          onClick={() => setDetailsOpen((open) => !open)}
        >
          <CheckIcon size={12} />
          Verified · See how it was written
        </button>
      </div>

      {detailsOpen ? (
        <div id={detailsId} className="mt-11 border-t border-[#E8E3DA] pt-9">
          <h2 className="font-writing text-2xl text-ink">
            How this was written
          </h2>

          <section className="mt-[30px]">
            <h3 className="font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
              Verified
            </h3>
            <p className="mt-2 font-writing text-[17px] text-ink">
              {verified.primary}
            </p>
            <p className="mt-3 font-writing text-[17px] text-[#5C564C]">
              {verified.secondary}
            </p>
          </section>

          <section className="mt-[30px]">
            <h3 className="font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
              Sittings
            </h3>
            <ul className="mt-2">
              {sittings.map((row, i) => (
                <li
                  key={`${row.startedAt}-${i}`}
                  className={[
                    "grid grid-cols-[1fr_auto_auto] gap-6 py-[9px] font-ui text-[13px] text-ink",
                    i > 0 ? "border-t border-[#EEEAE3]" : "",
                  ].join(" ")}
                >
                  <span>{formatSittingRowWhen(row.startedAt, locale)}</span>
                  <span className="text-right tabular-nums">
                    {formatDuration(row.activeWritingTimeMs)}
                  </span>
                  <span className="text-right tabular-nums">
                    {row.wordsAdded} words
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-[30px]">
            <h3 className="font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
              What&apos;s in it
            </h3>
            {legend.length > 0 ? (
              <>
                <div className="mt-3 flex h-2 w-full gap-0.5" aria-hidden>
                  {percents.typed > 0 ? (
                    <div
                      className="h-full"
                      style={{
                        width: `${percents.typed}%`,
                        background: SEGMENT_COLOR.typed,
                      }}
                    />
                  ) : null}
                  {percents.broughtIn > 0 ? (
                    <div
                      className="h-full"
                      style={{
                        width: `${percents.broughtIn}%`,
                        background: SEGMENT_COLOR.broughtIn,
                      }}
                    />
                  ) : null}
                  {percents.quoted > 0 ? (
                    <div
                      className="h-full"
                      style={{
                        width: `${percents.quoted}%`,
                        background: SEGMENT_COLOR.quoted,
                      }}
                    />
                  ) : null}
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 font-ui text-[12.5px] text-label">
                  {legend.map((part) => (
                    <li key={part.kind} className="inline-flex items-center gap-2">
                      <span
                        className="inline-block size-2 shrink-0"
                        style={{ background: SEGMENT_COLOR[part.kind] }}
                        aria-hidden
                      />
                      {part.label}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-3 font-ui text-[12.5px] text-label">
                No text recorded
              </p>
            )}
          </section>

          <section className="mt-[30px]">
            <h3 className="font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
              Revisions
            </h3>
            <p className="mt-2 font-writing text-[17px] text-ink">
              {formatRevisionLine(metrics.revisionRatio)}
            </p>
          </section>

          {notes.length > 0 ? (
            <section className="mt-[30px]">
              <h3 className="font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
                Notes
              </h3>
              <ul className="mt-2 space-y-1 font-writing text-[17px] text-ink">
                {notes.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="mt-[30px]">
            <button
              type="button"
              className="font-ui text-[11.5px] text-[#9A9387] underline-offset-2 hover:underline"
              aria-expanded={fingerprintsOpen}
              onClick={() => setFingerprintsOpen((open) => !open)}
            >
              Technical fingerprints, for anyone who wants to check
            </button>
            {fingerprintsOpen ? (
              <ul className="mt-3 space-y-2 font-ui text-[11.5px] break-all text-[#9A9387]">
                <li className="flex flex-wrap items-baseline gap-2">
                  <span className="shrink-0">Text</span>
                  <code className="min-w-0">{finalTextHash}</code>
                  <button
                    type="button"
                    className="shrink-0 underline-offset-2 hover:underline"
                    onClick={() => void copy("text", finalTextHash)}
                  >
                    {copied === "text" ? "Copied" : "Copy"}
                  </button>
                </li>
                <li className="flex flex-wrap items-baseline gap-2">
                  <span className="shrink-0">Writing log</span>
                  <code className="min-w-0">{chainHeadHash}</code>
                  <button
                    type="button"
                    className="shrink-0 underline-offset-2 hover:underline"
                    onClick={() => void copy("log", chainHeadHash)}
                  >
                    {copied === "log" ? "Copied" : "Copy"}
                  </button>
                </li>
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
