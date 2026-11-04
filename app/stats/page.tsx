import { auth } from "@/auth";
import { PaperPage, PAGE_TOP_OFFSET_PX } from "@/components/scene/PaperPage";
import { isAdminEmail } from "@/lib/analytics/admin";
import {
  formatFunnelPct,
  formatStatsCount,
  formatStatsDuration,
} from "@/lib/analytics/format";
import {
  loadStatsSnapshot,
  parseStatsDays,
  type FunnelStep,
} from "@/lib/analytics/stats";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Stats · Longhand",
  robots: { index: false, follow: false },
};

const FUNNEL_LABELS: Record<string, string> = {
  guest_started: "Guest started",
  signin_opened: "Sign-in opened",
  signed_in: "Signed in (new)",
  guest_claimed: "Guest claimed",
  published: "Published",
};

function Row({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-[7px] font-ui text-[13px] text-ink">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-[#BDB6AA] underline-offset-4 hover:decoration-ink"
        >
          {label}
        </a>
      ) : (
        <span>{label}</span>
      )}
      <span className="shrink-0 tabular-nums text-ink">{value}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-ui text-[11px] tracking-[0.14em] text-label uppercase">
        {title}
      </h2>
      <div className="mt-2 border-t border-[#EEEAE3]">{children}</div>
    </section>
  );
}

function funnelValue(step: FunnelStep): string {
  if (step.pctOfPrevious === null) {
    return formatStatsCount(step.count);
  }
  return `${formatStatsCount(step.count)} · ${formatFunnelPct(step.pctOfPrevious)}`;
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const session = await auth();
  if (!isAdminEmail(session?.user?.email)) {
    notFound();
  }

  const params = await searchParams;
  const days = parseStatsDays(params.days);
  const stats = await loadStatsSnapshot(days);

  return (
    <PaperPage topOffsetPx={PAGE_TOP_OFFSET_PX}>
      <h1
        className="font-writing text-[32px] leading-tight text-ink"
        data-paper-heading
      >
        Stats
      </h1>

      <p className="mt-3 font-ui text-[13px] text-label">
        <Link
          href="/stats?days=7"
          className={
            days === 7
              ? "text-ink underline decoration-ink underline-offset-4"
              : "underline decoration-[#BDB6AA] underline-offset-4 hover:decoration-ink"
          }
        >
          7 days
        </Link>
        <span aria-hidden className="mx-2">
          /
        </span>
        <Link
          href="/stats?days=30"
          className={
            days === 30
              ? "text-ink underline decoration-ink underline-offset-4"
              : "underline decoration-[#BDB6AA] underline-offset-4 hover:decoration-ink"
          }
        >
          30 days
        </Link>
      </p>

      <Section title="Visitors">
        <Row
          label="Vercel Analytics"
          value="Open"
          href="https://vercel.com/dashboard"
        />
      </Section>

      <Section title="Funnel">
        {stats.funnel.map((step) => (
          <Row
            key={step.name}
            label={FUNNEL_LABELS[step.name] ?? step.name}
            value={funnelValue(step)}
          />
        ))}
      </Section>

      <Section title="Writers">
        <Row
          label="New accounts"
          value={formatStatsCount(stats.writers.newAccounts)}
        />
        <Row
          label="New · Google"
          value={formatStatsCount(stats.writers.newAccountsGoogle)}
        />
        <Row
          label="New · email"
          value={formatStatsCount(stats.writers.newAccountsEmail)}
        />
        <Row
          label="Active writers"
          value={formatStatsCount(stats.writers.activeWriters)}
        />
        <Row
          label="Writing time"
          value={formatStatsDuration(stats.writers.totalWritingTimeMs)}
        />
        <Row
          label="Published · public"
          value={formatStatsCount(stats.writers.publishedPublic)}
        />
        <Row
          label="Published · private"
          value={formatStatsCount(stats.writers.publishedPrivate)}
        />
        <Row
          label="Median words"
          value={
            stats.writers.medianWords == null
              ? "—"
              : formatStatsCount(stats.writers.medianWords)
          }
        />
        <Row
          label="Tier · hand"
          value={formatStatsCount(stats.writers.tiers.hand)}
        />
        <Row
          label="Tier · most"
          value={formatStatsCount(stats.writers.tiers.most)}
        />
        <Row
          label="Tier · gathered"
          value={formatStatsCount(stats.writers.tiers.gathered)}
        />
        <Row
          label="Tier · shaped"
          value={formatStatsCount(stats.writers.tiers.shaped)}
        />
        <Row
          label="Week-1 retention"
          value={
            stats.writers.week1Retention.rate == null
              ? `${formatStatsCount(stats.writers.week1Retention.retained)} / ${formatStatsCount(stats.writers.week1Retention.cohort)}`
              : `${formatStatsCount(stats.writers.week1Retention.retained)} / ${formatStatsCount(stats.writers.week1Retention.cohort)} · ${stats.writers.week1Retention.rate}%`
          }
        />
      </Section>

      <Section title="Readers">
        <Row
          label="Published views"
          value="Vercel"
          href="https://vercel.com/dashboard"
        />
        <Row
          label="Receipt opened"
          value={formatStatsCount(stats.readers.receiptOpened)}
        />
        <Row
          label="Write on Longhand"
          value={formatStatsCount(stats.readers.writeOnLonghandClicked)}
        />
        <Row
          label="Example clicked"
          value={formatStatsCount(stats.readers.exampleClicked)}
        />
      </Section>

      <Section title="Limits">
        <Row
          label="Word cap"
          value={formatStatsCount(stats.limits.words)}
        />
        <Row
          label="Create limit"
          value={formatStatsCount(stats.limits.create)}
        />
        <Row
          label="Nudge shown"
          value={formatStatsCount(stats.limits.nudgeShown)}
        />
      </Section>
    </PaperPage>
  );
}
