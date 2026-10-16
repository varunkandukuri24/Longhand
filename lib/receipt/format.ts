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
  broughtIn: number;
  quoted: number;
};

/**
 * Convert fractional shares (0–1) to whole percents that always sum to 100.
 * Uses largest-remainder rounding. Empty/zero input yields 0/0/0.
 * The middle share is brought-in text (paste events that are not quoted).
 */
export function sharesToPercents(
  typedShare: number,
  broughtInShare: number,
  quotedShare: number,
): SharePercents {
  const raw = [typedShare, broughtInShare, quotedShare].map((share) => {
    if (!Number.isFinite(share) || share <= 0) {
      return 0;
    }
    return share * 100;
  });
  const total = raw[0] + raw[1] + raw[2];
  if (total <= 0) {
    return { typed: 0, broughtIn: 0, quoted: 0 };
  }

  const floors = raw.map((v) => Math.floor(v));
  const remainders = raw.map((v, i) => ({ i, rem: v - floors[i] }));
  const leftover = 100 - floors.reduce((a, b) => a + b, 0);

  remainders.sort((a, b) => b.rem - a.rem || a.i - b.i);
  const result = [...floors];
  for (let n = 0; n < leftover; n += 1) {
    result[remainders[n % remainders.length].i] += 1;
  }

  return { typed: result[0], broughtIn: result[1], quoted: result[2] };
}

/**
 * Signature sentence from typed share of the final text.
 * Tiers: ≥95%, 75–95%, 40–75%, under 40%. Response pieces replace the
 * full stop with ", in response to {site}."
 */
export function formatSignatureSentence(
  name: string,
  typedShare: number,
  responseSite?: string | null,
): string {
  const who = name.trim() || "Anonymous";
  let core: string;
  if (typedShare >= 0.95) {
    core = `${who} wrote this by hand`;
  } else if (typedShare >= 0.75) {
    core = `${who} wrote most of this by hand`;
  } else if (typedShare >= 0.4) {
    core = `${who} wrote and gathered this`;
  } else {
    core = `${who} gathered and shaped this`;
  }

  const site = responseSite?.trim();
  if (site) {
    return `${core}, in response to ${site}.`;
  }
  return `${core}.`;
}

/** "1 sitting" / "3 sittings". */
export function formatSittingCount(count: number): string {
  return count === 1 ? "1 sitting" : `${count} sittings`;
}

/**
 * Date range for the meta line: "Oct 11–13", or "Oct 11" on one day.
 * Adds the year only when it isn't the current year.
 */
export function formatSittingDateRange(
  starts: readonly number[],
  opts?: { now?: Date; locale?: string },
): string {
  if (starts.length === 0) {
    return "";
  }
  const now = opts?.now ?? new Date();
  const locale = opts?.locale;
  const times = starts.slice().sort((a, b) => a - b);
  const first = new Date(times[0]);
  const last = new Date(times[times.length - 1]);
  const currentYear = now.getFullYear();
  const needsYear =
    first.getFullYear() !== currentYear || last.getFullYear() !== currentYear;

  const monthDay = (d: Date) =>
    new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      ...(needsYear ? { year: "numeric" as const } : {}),
    }).format(d);

  const sameDay =
    first.getFullYear() === last.getFullYear() &&
    first.getMonth() === last.getMonth() &&
    first.getDate() === last.getDate();

  if (sameDay) {
    return monthDay(first);
  }

  const sameMonth =
    first.getFullYear() === last.getFullYear() &&
    first.getMonth() === last.getMonth();

  if (sameMonth && !needsYear) {
    const month = new Intl.DateTimeFormat(locale, { month: "short" }).format(
      first,
    );
    return `${month} ${first.getDate()}–${last.getDate()}`;
  }

  return `${monthDay(first)}–${monthDay(last)}`;
}

/**
 * Meta line under the signature: "52 min over 3 sittings · Oct 11–13".
 */
export function formatSignatureMeta(
  activeWritingTimeMs: number,
  sittingStarts: readonly number[],
  opts?: { now?: Date; locale?: string },
): string {
  const duration = formatDuration(activeWritingTimeMs);
  const sittings = formatSittingCount(sittingStarts.length);
  const range = formatSittingDateRange(sittingStarts, opts);
  if (!range) {
    return `${duration} over ${sittings}`;
  }
  return `${duration} over ${sittings} · ${range}`;
}

/** Sitting row date+time: "Mon, Oct 11 · 2:14 PM". */
export function formatSittingRowWhen(
  startedAt: number,
  locale?: string,
): string {
  const d = new Date(startedAt);
  const day = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return `${day} · ${time}`;
}

export type CompositionLegendPart = {
  kind: "typed" | "broughtIn" | "quoted";
  percent: number;
  label: string;
};

/**
 * WHAT'S IN IT legend parts: only non-zero, whole percents that sum to 100.
 * Labels say "brought in" for non-quoted paste origin.
 */
export function formatCompositionLegend(
  typedShare: number,
  broughtInShare: number,
  quotedShare: number,
  quotedSite?: string | null,
): CompositionLegendPart[] {
  const percents = sharesToPercents(typedShare, broughtInShare, quotedShare);
  const parts: CompositionLegendPart[] = [];
  if (percents.typed > 0) {
    parts.push({
      kind: "typed",
      percent: percents.typed,
      label: `${percents.typed}% typed here`,
    });
  }
  if (percents.broughtIn > 0) {
    parts.push({
      kind: "broughtIn",
      percent: percents.broughtIn,
      label: `${percents.broughtIn}% brought in`,
    });
  }
  if (percents.quoted > 0) {
    const site = quotedSite?.trim();
    parts.push({
      kind: "quoted",
      percent: percents.quoted,
      label: site
        ? `${percents.quoted}% quoted from ${site}`
        : `${percents.quoted}% quoted`,
    });
  }
  return parts;
}

/** "{ratio} words written for every word kept." */
export function formatRevisionLine(revisionRatio: number): string {
  if (!Number.isFinite(revisionRatio) || revisionRatio <= 0) {
    return "0 words written for every word kept.";
  }
  const rounded = Math.round(revisionRatio * 10) / 10;
  const text =
    Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} words written for every word kept.`;
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

/**
 * NOTES lines for timing flags / delayed sync, or null when none.
 * Plain words per DESIGN.md.
 */
export function formatReceiptNotes(metrics: {
  fastStretchCount: number;
  uniformTypingRunCount: number;
  delayedBatchCount: number;
}): string[] | null {
  const parts: string[] = [];
  if (metrics.fastStretchCount > 0) {
    parts.push(
      metrics.fastStretchCount === 1
        ? "1 stretch of unusually fast typing"
        : `${metrics.fastStretchCount} stretches of unusually fast typing`,
    );
  }
  if (metrics.uniformTypingRunCount > 0) {
    parts.push(
      metrics.uniformTypingRunCount === 1
        ? "1 stretch of unusually uniform typing"
        : `${metrics.uniformTypingRunCount} stretches of unusually uniform typing`,
    );
  }
  if (metrics.delayedBatchCount > 0) {
    parts.push(
      metrics.delayedBatchCount === 1
        ? "1 stretch written offline and synced later"
        : `${metrics.delayedBatchCount} stretches written offline and synced later`,
    );
  }
  if (parts.length === 0) {
    return null;
  }
  return parts;
}

/** Verified body copy for the details section. */
export function formatVerifiedCopy(publishedAt: Date, locale?: string): {
  primary: string;
  secondary: string;
} {
  const date = formatReceiptDate(publishedAt, locale);
  return {
    primary: `Longhand recorded this piece as it was written, keystroke by keystroke, on its own clock. The published text matches that record exactly, and neither has changed since it was published on ${date}.`,
    secondary:
      "It shows how the words got onto the page. It can't see what happened off the page, like what the writer read or talked through first.",
  };
}
