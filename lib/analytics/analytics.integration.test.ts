import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { ANALYTICS_EVENT_NAMES } from "./names";
import { buildFunnel } from "./stats";

process.env.AUTH_SECRET ??= "test-secret-for-analytics-hmac";

const databaseUrl = process.env.DATABASE_URL;

const authMock = vi.hoisted(() => ({
  email: null as string | null,
  userId: null as string | null,
}));

const ipMock = vi.hoisted(() => ({ value: "198.51.100.40" }));

vi.mock("@/auth", () => ({
  auth: async () =>
    authMock.userId
      ? { user: { id: authMock.userId, email: authMock.email } }
      : null,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
  }),
  headers: async () => ({
    get: (name: string) =>
      name === "x-forwarded-for" ? ipMock.value : null,
  }),
}));

async function expectNotFound(run: () => Promise<unknown>) {
  try {
    await run();
    expect.fail("expected notFound()");
  } catch (err) {
    const digest =
      err && typeof err === "object" && "digest" in err
        ? String((err as { digest: unknown }).digest)
        : "";
    expect(digest).toContain("404");
  }
}

describe.skipIf(!databaseUrl)("analytics integration", () => {
  const suffix = crypto.randomUUID().slice(0, 8);
  const adminEmail = `admin-${suffix}@example.test`;
  const userId = `analytics-admin-${suffix}`;
  let POST_events: typeof import("@/app/api/events/route").POST;
  let track: typeof import("./track").track;
  let loadStatsSnapshot: typeof import("./stats").loadStatsSnapshot;
  let StatsPage: typeof import("@/app/stats/page").default;
  const seededIds: string[] = [];

  beforeAll(async () => {
    process.env.ADMIN_EMAILS = adminEmail;
    ipMock.value = `198.51.100.${50 + (parseInt(suffix.slice(0, 2), 16) % 50)}`;

    ({ POST: POST_events } = await import("@/app/api/events/route"));
    ({ track } = await import("./track"));
    ({ loadStatsSnapshot } = await import("./stats"));
    ({ default: StatsPage } = await import("@/app/stats/page"));

    await db.insert(schema.users).values({
      id: userId,
      email: adminEmail,
      name: "Admin",
      handle: `an-${suffix}`,
    });
  });

  afterAll(async () => {
    if (seededIds.length > 0) {
      await db
        .delete(schema.analyticsEvents)
        .where(inArray(schema.analyticsEvents.id, seededIds));
    }
    await db
      .delete(schema.analyticsEvents)
      .where(eq(schema.analyticsEvents.userId, userId));
    await db.delete(schema.users).where(eq(schema.users.id, userId));
  });

  it("ignores non-allowlisted client event names", async () => {
    const [{ n: before }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.analyticsEvents);

    const blockedServerOnly = await POST_events(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "signed_in",
          props: { method: "email", new_account: true },
        }),
      }),
    );
    expect(blockedServerOnly.status).toBe(200);

    const blockedUnknown = await POST_events(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "not_real",
          props: { text: "secret writing" },
        }),
      }),
    );
    expect(blockedUnknown.status).toBe(200);

    const [{ n: after }] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.analyticsEvents);
    expect(after).toBe(before);
  });

  it("records allowlisted client events and never stores writing text", async () => {
    const res = await POST_events(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "receipt_opened", props: {} }),
      }),
    );
    expect(res.status).toBe(200);

    await track("published", {
      userId,
      props: {
        visibility: "public",
        tier: "hand",
        words: "under 100",
      },
    });

    const rows = await db
      .select({
        id: schema.analyticsEvents.id,
        name: schema.analyticsEvents.name,
        props: schema.analyticsEvents.props,
      })
      .from(schema.analyticsEvents)
      .where(
        inArray(schema.analyticsEvents.name, [
          "receipt_opened",
          "published",
        ]),
      );

    const allowedKeys = new Set([
      "reason",
      "method",
      "new_account",
      "kind",
      "visibility",
      "tier",
      "words",
    ]);

    expect(rows.length).toBeGreaterThanOrEqual(1);
    for (const row of rows) {
      seededIds.push(row.id);
      expect(ANALYTICS_EVENT_NAMES).toContain(row.name);
      for (const key of Object.keys(row.props ?? {})) {
        expect(allowedKeys.has(key)).toBe(true);
      }
      expect(JSON.stringify(row.props)).not.toMatch(
        /secret writing|finalText|@example\.test/i,
      );
    }
  });

  it("rate-limits /api/events after 120 hits per hour for an IP", async () => {
    const { allow } = await import("@/lib/rate-limit");
    // Keep this IP off the 203.0.113.0/24 block other integration tests use.
    const limitIp = `198.51.100.${100 + (parseInt(suffix.slice(2, 4), 16) % 100)}`;
    ipMock.value = limitIp;

    for (let i = 0; i < 120; i += 1) {
      expect(await allow("events_ip", limitIp, 120, 60 * 60 * 1000)).toBe(
        true,
      );
    }

    const res = await POST_events(
      new Request("http://localhost/api/events", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "example_clicked", props: {} }),
      }),
    );
    expect(res.status).toBe(429);
  });

  it("counts the funnel from seeded analytics_events rows", async () => {
    const now = new Date();
    const stamp = new Date(now.getTime() - 60_000);
    const seed = [
      "guest_started",
      "guest_started",
      "signin_opened",
      "signed_in",
      "guest_claimed",
      "published",
    ] as const;

    for (const name of seed) {
      const [row] = await db
        .insert(schema.analyticsEvents)
        .values({
          name,
          userId: name === "guest_started" ? null : userId,
          props:
            name === "signed_in"
              ? { method: "email", new_account: true }
              : name === "published"
                ? {
                    visibility: "public",
                    tier: "hand",
                    words: "under 100",
                  }
                : name === "signin_opened"
                  ? { reason: "keep" }
                  : {},
          createdAt: stamp,
        })
        .returning({ id: schema.analyticsEvents.id });
      seededIds.push(row.id);
    }

    const stats = await loadStatsSnapshot(7, now);
    const byName = Object.fromEntries(
      stats.funnel.map((s) => [s.name, s.count]),
    );

    expect(byName.guest_started).toBeGreaterThanOrEqual(2);
    expect(byName.signin_opened).toBeGreaterThanOrEqual(1);
    expect(byName.signed_in).toBeGreaterThanOrEqual(1);
    expect(byName.guest_claimed).toBeGreaterThanOrEqual(1);
    expect(byName.published).toBeGreaterThanOrEqual(1);

    const rebuilt = buildFunnel({
      guest_started: byName.guest_started,
      signin_opened: byName.signin_opened,
      signed_in: byName.signed_in,
      guest_claimed: byName.guest_claimed,
      published: byName.published,
    });
    expect(rebuilt[1].pctOfPrevious).toBe(
      Math.round((byName.signin_opened / byName.guest_started) * 100),
    );
  });

  it("/stats 404s for non-admins and renders for an admin", async () => {
    authMock.userId = userId;
    authMock.email = "not-admin@example.test";
    await expectNotFound(() =>
      StatsPage({ searchParams: Promise.resolve({}) }),
    );

    authMock.email = adminEmail;
    const tree = await StatsPage({
      searchParams: Promise.resolve({ days: "7" }),
    });
    expect(tree).toBeTruthy();
  });
});
