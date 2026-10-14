import {
  formatDuration,
  formatReceiptDate,
  formatReceiptNotes,
  pieceCardNumber,
  sharesToPercents,
} from "@/lib/receipt/format";
import type { ReceiptMetrics } from "@/lib/receipt/types";

type LibraryCardProps = {
  pieceId: string;
  title: string;
  author: string;
  publishedAt: Date;
  metrics: ReceiptMetrics;
  locale?: string;
};

export function LibraryCard({
  pieceId,
  title,
  author,
  publishedAt,
  metrics,
  locale,
}: LibraryCardProps) {
  const percents = sharesToPercents(
    metrics.typedShare,
    metrics.pastedShare,
    metrics.quotedShare,
  );
  const notes = formatReceiptNotes(metrics);
  const cardNo = pieceCardNumber(pieceId);
  const totalMinutesLabel = formatDuration(metrics.activeWritingTimeMs);
  const totalWords = metrics.wordCount;

  return (
    <article className="relative overflow-hidden rounded-[6px] bg-page px-6 py-5 text-ink shadow-page">
      <header className="flex items-baseline justify-between gap-4 font-ui text-[12px] tracking-wide text-ink/70">
        <span>LONGHAND</span>
        <span>No. {String(cardNo).padStart(3, "0")}</span>
      </header>

      <h2 className="mt-4 font-writing text-[22px] italic leading-snug text-ink">
        {title}
      </h2>
      <p className="mt-2 font-ui text-[12px] text-ink/65">
        {author}
        <span className="mx-2 text-ink/35">·</span>
        {formatReceiptDate(publishedAt, locale)}
      </p>

      <table className="mt-5 w-full border-collapse font-ui text-[12px] text-ink/85">
        <thead>
          <tr className="border-b border-ink/20 text-left text-ink/50">
            <th className="py-1.5 font-normal">Date</th>
            <th className="py-1.5 text-right font-normal">Time</th>
            <th className="py-1.5 text-right font-normal">Words</th>
          </tr>
        </thead>
        <tbody>
          {metrics.sessionRows.map((row, i) => (
            <tr key={`${row.startedAt}-${i}`} className="border-b border-ink/10">
              <td className="py-1.5">
                {formatReceiptDate(new Date(row.startedAt), locale)}
              </td>
              <td className="py-1.5 text-right">
                {formatDuration(row.activeWritingTimeMs)}
              </td>
              <td className="py-1.5 text-right">{row.wordsAdded}</td>
            </tr>
          ))}
          <tr className="border-t border-ink/30">
            <td className="py-2 font-medium">Total</td>
            <td className="py-2 text-right font-medium">{totalMinutesLabel}</td>
            <td className="py-2 text-right font-medium">{totalWords}</td>
          </tr>
        </tbody>
      </table>

      {notes ? (
        <p className="mt-3 font-ui text-[12px] text-ink/55">{notes}</p>
      ) : null}

      <div
        className="pointer-events-none absolute right-4 bottom-6 flex w-30 -rotate-12 flex-col items-center border-2 border-[#3D5A8A] px-2 py-2 text-center text-[#3D5A8A]"
        aria-hidden
      >
        <span className="font-ui text-[13px] font-medium leading-tight tracking-wide">
          {percents.typed}% BY HAND
        </span>
        <span className="mt-1 font-ui text-[9px] leading-tight tracking-wide">
          {percents.pasted}% PASTED · {percents.quoted}% QUOTED
        </span>
      </div>
    </article>
  );
}
