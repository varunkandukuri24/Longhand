import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENV_KEYS = [
  "GUEST_CREATE_PER_IP_DAY",
  "GUEST_BATCH_PER_IP_HOUR",
  "GUEST_WORD_LIMIT",
  "GUEST_CHAR_LIMIT",
  "GUEST_NUDGE_WORDS",
  "VERCEL_ENV",
] as const;

const saved = new Map<string, string | undefined>();

function stashEnv() {
  saved.clear();
  for (const key of ENV_KEYS) {
    saved.set(key, process.env[key]);
    delete process.env[key];
  }
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    const value = saved.get(key);
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

async function loadLimits() {
  return import("./limits");
}

describe("guest word and character limits", () => {
  beforeEach(() => {
    stashEnv();
    vi.resetModules();
  });

  afterEach(() => {
    restoreEnv();
    vi.resetModules();
  });

  it("shows the nudge at 50 words by default", async () => {
    const { GUEST_NUDGE_WORDS } = await loadLimits();
    expect(GUEST_NUDGE_WORDS).toBe(50);
  });

  it("allows exactly 500 words and 4000 characters by default", async () => {
    const {
      GUEST_WORD_LIMIT,
      GUEST_CHAR_LIMIT,
      exceedsGuestLimit,
      atGuestLimit,
    } = await loadLimits();
    const words = Array.from({ length: GUEST_WORD_LIMIT }, () => "word").join(
      " ",
    );
    expect(exceedsGuestLimit(words)).toBe(false);
    expect(atGuestLimit(words)).toBe(true);
    expect(exceedsGuestLimit("a".repeat(GUEST_CHAR_LIMIT))).toBe(false);
    expect(atGuestLimit("a".repeat(GUEST_CHAR_LIMIT))).toBe(true);
  });

  it("rejects 501 words or 4001 characters by default", async () => {
    const { GUEST_WORD_LIMIT, GUEST_CHAR_LIMIT, exceedsGuestLimit } =
      await loadLimits();
    const words = Array.from(
      { length: GUEST_WORD_LIMIT + 1 },
      () => "word",
    ).join(" ");
    expect(exceedsGuestLimit(words)).toBe(true);
    expect(exceedsGuestLimit("a".repeat(GUEST_CHAR_LIMIT + 1))).toBe(true);
  });

  it("defaults create and batch per-IP limits to 20 and 2000", async () => {
    const { GUEST_CREATE_PER_IP, GUEST_BATCH_PER_IP } = await loadLimits();
    expect(GUEST_CREATE_PER_IP).toBe(20);
    expect(GUEST_BATCH_PER_IP).toBe(2000);
  });

  it("reads overrides from the environment", async () => {
    process.env.GUEST_CREATE_PER_IP_DAY = "7";
    process.env.GUEST_BATCH_PER_IP_HOUR = "900";
    process.env.GUEST_WORD_LIMIT = "100";
    process.env.GUEST_CHAR_LIMIT = "800";
    process.env.GUEST_NUDGE_WORDS = "25";
    const {
      GUEST_CREATE_PER_IP,
      GUEST_BATCH_PER_IP,
      GUEST_WORD_LIMIT,
      GUEST_CHAR_LIMIT,
      GUEST_NUDGE_WORDS,
    } = await loadLimits();
    expect(GUEST_CREATE_PER_IP).toBe(7);
    expect(GUEST_BATCH_PER_IP).toBe(900);
    expect(GUEST_WORD_LIMIT).toBe(100);
    expect(GUEST_CHAR_LIMIT).toBe(800);
    expect(GUEST_NUDGE_WORDS).toBe(25);
  });

  it("falls back to defaults on invalid values", async () => {
    process.env.GUEST_CREATE_PER_IP_DAY = "0";
    process.env.GUEST_BATCH_PER_IP_HOUR = "-5";
    process.env.GUEST_WORD_LIMIT = "nope";
    process.env.GUEST_CHAR_LIMIT = "";
    process.env.GUEST_NUDGE_WORDS = "1.5";
    const {
      GUEST_CREATE_PER_IP,
      GUEST_BATCH_PER_IP,
      GUEST_WORD_LIMIT,
      GUEST_CHAR_LIMIT,
      GUEST_NUDGE_WORDS,
    } = await loadLimits();
    expect(GUEST_CREATE_PER_IP).toBe(20);
    expect(GUEST_BATCH_PER_IP).toBe(2000);
    expect(GUEST_WORD_LIMIT).toBe(500);
    expect(GUEST_CHAR_LIMIT).toBe(4000);
    expect(GUEST_NUDGE_WORDS).toBe(50);
  });

  it("multiplies per-IP limits by 10 on preview deployments", async () => {
    process.env.VERCEL_ENV = "preview";
    process.env.GUEST_CREATE_PER_IP_DAY = "20";
    process.env.GUEST_BATCH_PER_IP_HOUR = "2000";
    process.env.GUEST_WORD_LIMIT = "500";
    process.env.GUEST_CHAR_LIMIT = "4000";
    process.env.GUEST_NUDGE_WORDS = "50";
    const {
      GUEST_CREATE_PER_IP,
      GUEST_BATCH_PER_IP,
      GUEST_WORD_LIMIT,
      GUEST_CHAR_LIMIT,
      GUEST_NUDGE_WORDS,
    } = await loadLimits();
    expect(GUEST_CREATE_PER_IP).toBe(200);
    expect(GUEST_BATCH_PER_IP).toBe(20_000);
    expect(GUEST_WORD_LIMIT).toBe(500);
    expect(GUEST_CHAR_LIMIT).toBe(4000);
    expect(GUEST_NUDGE_WORDS).toBe(50);
  });
});
