/** Format active/elapsed durations for the receipt. Never uses decimals. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) {
    return "<1 min";
  }
  if (ms < 60_000) {
    return "<1 min";
  }
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${minutes} min`;
}

export type SharePercents = {
  typed: number;
  pasted: number;
  quoted: number;
};

/**
 * Second stamp line: only non-zero pasted/quoted shares.
 * Returns null when both are zero (line omitted).
 */
export function formatStampSecondaryLine(
  pasted: number,
  quoted: number,
): string | null {
  const parts: string[] = [];
  if (pasted > 0) {
    parts.push(`${pasted}% PASTED`);
  }
  if (quoted > 0) {
    parts.push(`${quoted}% QUOTED`);
  }
  if (parts.length === 0) {
    return null;
  }
  return parts.join(" · ");
}

/**
 * Convert fractional shares (0–1) to whole percents that always sum to 100.
 * Uses largest-remainder rounding. Empty/zero input yields 0/0/0.
 */
export function sharesToPercents(
  typedShare: number,
  pastedShare: number,
  quotedShare: number,
): SharePercents {
  const raw = [typedShare, pastedShare, quotedShare].map((share) => {
    if (!Number.isFinite(share) || share <= 0) {
      return 0;
    }
    return share * 100;
  });
  const total = raw[0] + raw[1] + raw[2];
  if (total <= 0) {
    return { typed: 0, pasted: 0, quoted: 0 };
  }

  const floors = raw.map((v) => Math.floor(v));
  const remainders = raw.map((v, i) => ({ i, rem: v - floors[i] }));
  let leftover = 100 - floors.reduce((a, b) => a + b, 0);

  remainders.sort((a, b) => b.rem - a.rem || a.i - b.i);
  const result = [...floors];
  for (let n = 0; n < leftover; n += 1) {
    result[remainders[n % remainders.length].i] += 1;
  }

  return { typed: result[0], pasted: result[1], quoted: result[2] };
}

/** Date in the reader's locale, e.g. "Oct 13, 2026". */
export function formatReceiptDate(
  date: Date,
  locale?: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/** Shorten a hex hash to "7f3a·c91e" (first 4 · last 4). */
export function shortenHash(hex: string): string {
  const clean = hex.trim().toLowerCase();
  if (clean.length < 8) {
    return clean;
  }
  return `${clean.slice(0, 4)}·${clean.slice(-4)}`;
}

/** One plain line for timing flags / delayed sync, or null when none. */
export function formatReceiptNotes(metrics: {
  fastStretchCount: number;
  uniformTypingRunCount: number;
  delayedBatchCount: number;
}): string | null {
  const parts: string[] = [];
  if (metrics.fastStretchCount > 0) {
    parts.push(
      metrics.fastStretchCount === 1
        ? "1 unusually fast stretch"
        : `${metrics.fastStretchCount} unusually fast stretches`,
    );
  }
  if (metrics.uniformTypingRunCount > 0) {
    parts.push(
      metrics.uniformTypingRunCount === 1
        ? "1 unusually uniform stretch"
        : `${metrics.uniformTypingRunCount} unusually uniform stretches`,
    );
  }
  if (metrics.delayedBatchCount > 0) {
    parts.push(
      metrics.delayedBatchCount === 1
        ? "1 offline stretch"
        : `${metrics.delayedBatchCount} offline stretches`,
    );
  }
  if (parts.length === 0) {
    return null;
  }
  return parts.join(". ") + ".";
}

/** Stable card number from a piece UUID (1–9999). */
export function pieceCardNumber(pieceId: string): number {
  const hex = pieceId.replace(/-/g, "").slice(0, 8);
  const n = Number.parseInt(hex, 16);
  if (!Number.isFinite(n)) {
    return 1;
  }
  return (n % 9999) + 1;
}
