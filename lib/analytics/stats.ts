import { db } from "@/db";
import {
  accounts,
  analyticsEvents,
  eventBatches,
  pieces,
  receipts,
  sessions,
  users,
} from "@/db/schema";
import { activeWritingTimeMs } from "@/lib/receipt/compute-receipt";
import type { EditEvent, ReceiptBatchInput } from "@/lib/receipt/types";
import { and, count, eq, gte, lt, sql } from "drizzle-orm";
import type { SignatureTierProp } from "./names";

export type StatsRangeDays = 7 | 30;

export type FunnelStep = {
  name: string;
  count: number;
  /** Percent of the previous step; null for the first step. */
  pctOfPrevious: number | null;
};

export type StatsSnapshot = {
  days: StatsRangeDays;
  since: Date;
  funnel: FunnelStep[];
  writers: {
    newAccounts: number;
    newAccountsGoogle: number;
    newAccountsEmail: number;
    activeWriters: number;
    totalWritingTimeMs: number;
    publishedPublic: number;
    publishedPrivate: number;
    medianWords: number | null;
    tiers: Record<SignatureTierProp, number>;
    week1Retention: { cohort: number; retained: number; rate: number | null };
  };
  readers: {
    receiptOpened: number;
    writeOnLonghandClicked: number;
    exampleClicked: number;
  };
  limits: {
    words: number;
    create: number;
    nudgeShown: number;
  };
};

const FUNNEL_NAMES = [
  "guest_started",
  "signin_opened",
  "signed_in",
  "guest_claimed",
  "published",
] as const;

export function parseStatsDays(raw: string | undefined | null): StatsRangeDays {
  return raw === "30" ? 30 : 7;
}

export async function loadStatsSnapshot(
  days: StatsRangeDays,
  now: Date = new Date(),
): Promise<StatsSnapshot> {
  const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const funnelCounts = await countEventsByName(
    [...FUNNEL_NAMES],
    since,
    now,
    { signed_in: { new_account: true } },
  );

  const funnel: FunnelStep[] = [];
  for (let i = 0; i < FUNNEL_NAMES.length; i += 1) {
    const name = FUNNEL_NAMES[i];
    const n = funnelCounts.get(name) ?? 0;
    const prev = i === 0 ? null : (funnel[i - 1]?.count ?? 0);
    funnel.push({
      name,
      count: n,
      pctOfPrevious:
        prev === null ? null : prev === 0 ? 0 : Math.round((n / prev) * 100),
    });
  }

  const newAccounts = await countNewAccounts(since, now);
  const activeWriters = await countActiveWriters(since, now);
  const totalWritingTimeMs = await sumActiveWritingTimeMs(since, now);
  const published = await countPublished(since, now);
  const medianWords = await medianPublishedWords(since, now);
  const tiers = await countSignatureTiers(since, now);
  const week1 = await week1Retention(now);

  const readers = {
    receiptOpened: (await countNamed("receipt_opened", since, now)) ?? 0,
    writeOnLonghandClicked:
      (await countNamed("write_on_longhand_clicked", since, now)) ?? 0,
    exampleClicked: (await countNamed("example_clicked", since, now)) ?? 0,
  };

  const limits = {
    words: await countLimitKind("words", since, now),
    create: await countLimitKind("create", since, now),
    nudgeShown: (await countNamed("guest_nudge_shown", since, now)) ?? 0,
  };

  return {
    days,
    since,
    funnel,
    writers: {
      newAccounts: newAccounts.total,
      newAccountsGoogle: newAccounts.google,
      newAccountsEmail: newAccounts.email,
      activeWriters,
      totalWritingTimeMs,
      publishedPublic: published.public,
      publishedPrivate: published.private,
      medianWords,
      tiers,
      week1Retention: week1,
    },
    readers,
    limits,
  };
}

async function countNamed(
  name: string,
  since: Date,
  until: Date,
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.name, name),
        gte(analyticsEvents.createdAt, since),
        lt(analyticsEvents.createdAt, until),
      ),
    );
  return Number(row?.n ?? 0);
}

async function countEventsByName(
  names: readonly string[],
  since: Date,
  until: Date,
  filters: Record<string, Record<string, boolean>> = {},
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const name of names) {
    const filter = filters[name];
    if (filter) {
      const conditions = [
        eq(analyticsEvents.name, name),
        gte(analyticsEvents.createdAt, since),
        lt(analyticsEvents.createdAt, until),
      ];
      for (const [key, value] of Object.entries(filter)) {
        conditions.push(
          sql`${analyticsEvents.props} ->> ${key} = ${String(value)}`,
        );
      }
      const [row] = await db
        .select({ n: count() })
        .from(analyticsEvents)
        .where(and(...conditions));
      out.set(name, Number(row?.n ?? 0));
    } else {
      out.set(name, await countNamed(name, since, until));
    }
  }
  return out;
}

async function countLimitKind(
  kind: "words" | "create",
  since: Date,
  until: Date,
): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(analyticsEvents)
    .where(
      and(
        eq(analyticsEvents.name, "limit_hit"),
        gte(analyticsEvents.createdAt, since),
        lt(analyticsEvents.createdAt, until),
        sql`${analyticsEvents.props} ->> 'kind' = ${kind}`,
      ),
    );
  return Number(row?.n ?? 0);
}

async function countNewAccounts(
  since: Date,
  until: Date,
): Promise<{ total: number; google: number; email: number }> {
  const [totalRow] = await db
    .select({ n: count() })
    .from(users)
    .where(and(gte(users.createdAt, since), lt(users.createdAt, until)));

  const providerRows = await db
    .select({
      provider: accounts.provider,
      n: count(),
    })
    .from(accounts)
    .innerJoin(users, eq(accounts.userId, users.id))
    .where(and(gte(users.createdAt, since), lt(users.createdAt, until)))
    .groupBy(accounts.provider);

  let google = 0;
  let email = 0;
  for (const row of providerRows) {
    const n = Number(row.n ?? 0);
    if (row.provider === "google") google += n;
    else email += n;
  }

  return { total: Number(totalRow?.n ?? 0), google, email };
}

async function countActiveWriters(since: Date, until: Date): Promise<number> {
  const result = await db.execute<{ n: string }>(sql`
    select count(distinct coalesce(p.user_id::text, p.guest_id::text)) as n
    from event_batches eb
    inner join sessions s on s.id = eb.session_id
    inner join pieces p on p.id = s.piece_id
    where eb.server_received_at >= ${since}
      and eb.server_received_at < ${until}
  `);
  return Number(result.rows[0]?.n ?? 0);
}

async function sumActiveWritingTimeMs(
  since: Date,
  until: Date,
): Promise<number> {
  const rows = await db
    .select({
      sessionId: eventBatches.sessionId,
      sessionStartedAt: sessions.startedAt,
      serverReceivedAt: eventBatches.serverReceivedAt,
      delayed: eventBatches.delayed,
      events: eventBatches.events,
    })
    .from(eventBatches)
    .innerJoin(sessions, eq(eventBatches.sessionId, sessions.id))
    .where(
      and(
        gte(eventBatches.serverReceivedAt, since),
        lt(eventBatches.serverReceivedAt, until),
      ),
    );

  const bySession = new Map<string, ReceiptBatchInput[]>();
  for (const row of rows) {
    const list = bySession.get(row.sessionId) ?? [];
    list.push({
      sessionId: row.sessionId,
      sessionStartedAt: row.sessionStartedAt.getTime(),
      serverReceivedAt: row.serverReceivedAt.getTime(),
      delayed: row.delayed,
      events: row.events as EditEvent[],
    });
    bySession.set(row.sessionId, list);
  }

  let total = 0;
  for (const batches of bySession.values()) {
    total += activeWritingTimeMs(batches);
  }
  return total;
}

async function countPublished(
  since: Date,
  until: Date,
): Promise<{ public: number; private: number }> {
  const rows = await db
    .select({
      visibility: pieces.visibility,
      n: count(),
    })
    .from(pieces)
    .where(
      and(
        eq(pieces.status, "published"),
        gte(pieces.publishedAt, since),
        lt(pieces.publishedAt, until),
      ),
    )
    .groupBy(pieces.visibility);

  let pub = 0;
  let priv = 0;
  for (const row of rows) {
    const n = Number(row.n ?? 0);
    if (row.visibility === "public") pub = n;
    else priv = n;
  }
  return { public: pub, private: priv };
}

async function medianPublishedWords(
  since: Date,
  until: Date,
): Promise<number | null> {
  const result = await db.execute<{ median: string | null }>(sql`
    select percentile_cont(0.5) within group (
      order by (r.metrics ->> 'wordCount')::double precision
    ) as median
    from receipts r
    inner join pieces p on p.id = r.piece_id
    where p.status = 'published'
      and p.published_at >= ${since}
      and p.published_at < ${until}
  `);
  const median = result.rows[0]?.median;
  if (median == null) return null;
  return Math.round(Number(median));
}

async function countSignatureTiers(
  since: Date,
  until: Date,
): Promise<Record<SignatureTierProp, number>> {
  const [row] = await db
    .select({
      hand: sql<number>`count(*) filter (where (${receipts.metrics} ->> 'typedShare')::float >= 0.95)`,
      most: sql<number>`count(*) filter (where (${receipts.metrics} ->> 'typedShare')::float >= 0.75 and (${receipts.metrics} ->> 'typedShare')::float < 0.95)`,
      gathered: sql<number>`count(*) filter (where (${receipts.metrics} ->> 'typedShare')::float >= 0.4 and (${receipts.metrics} ->> 'typedShare')::float < 0.75)`,
      shaped: sql<number>`count(*) filter (where (${receipts.metrics} ->> 'typedShare')::float < 0.4)`,
    })
    .from(receipts)
    .innerJoin(pieces, eq(receipts.pieceId, pieces.id))
    .where(
      and(
        eq(pieces.status, "published"),
        gte(pieces.publishedAt, since),
        lt(pieces.publishedAt, until),
      ),
    );

  return {
    hand: Number(row?.hand ?? 0),
    most: Number(row?.most ?? 0),
    gathered: Number(row?.gathered ?? 0),
    shaped: Number(row?.shaped ?? 0),
  };
}

/**
 * Accounts created 8–14 days ago that wrote again on relative day 2–7.
 */
async function week1Retention(
  now: Date,
): Promise<{ cohort: number; retained: number; rate: number | null }> {
  const cohortEnd = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
  const cohortStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [cohortRow] = await db
    .select({ n: count() })
    .from(users)
    .where(
      and(gte(users.createdAt, cohortStart), lt(users.createdAt, cohortEnd)),
    );
  const cohort = Number(cohortRow?.n ?? 0);

  const retainedResult = await db.execute<{ n: string }>(sql`
    select count(distinct u.id) as n
    from users u
    where u.created_at >= ${cohortStart}
      and u.created_at < ${cohortEnd}
      and exists (
        select 1
        from pieces p
        inner join sessions s on s.piece_id = p.id
        inner join event_batches eb on eb.session_id = s.id
        where p.user_id = u.id
          and eb.server_received_at >= u.created_at + interval '1 day'
          and eb.server_received_at < u.created_at + interval '7 days'
      )
  `);
  const retained = Number(retainedResult.rows[0]?.n ?? 0);

  return {
    cohort,
    retained,
    rate: cohort === 0 ? null : Math.round((retained / cohort) * 100),
  };
}

/** Pure funnel helper for unit tests with seeded counts. */
export function buildFunnel(
  counts: Partial<Record<(typeof FUNNEL_NAMES)[number], number>>,
): FunnelStep[] {
  const steps: FunnelStep[] = [];
  for (let i = 0; i < FUNNEL_NAMES.length; i += 1) {
    const name = FUNNEL_NAMES[i];
    const n = counts[name] ?? 0;
    const prev = i === 0 ? null : (steps[i - 1]?.count ?? 0);
    steps.push({
      name,
      count: n,
      pctOfPrevious:
        prev === null ? null : prev === 0 ? 0 : Math.round((n / prev) * 100),
    });
  }
  return steps;
}
