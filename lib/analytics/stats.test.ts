import { describe, expect, it } from "vitest";
import { buildFunnel, parseStatsDays } from "./stats";

describe("parseStatsDays", () => {
  it("defaults to 7 and accepts 30", () => {
    expect(parseStatsDays(undefined)).toBe(7);
    expect(parseStatsDays("7")).toBe(7);
    expect(parseStatsDays("30")).toBe(30);
    expect(parseStatsDays("90")).toBe(7);
  });
});

describe("buildFunnel", () => {
  it("computes percent of the previous step", () => {
    const funnel = buildFunnel({
      guest_started: 100,
      signin_opened: 40,
      signed_in: 20,
      guest_claimed: 10,
      published: 5,
    });
    expect(funnel.map((s) => [s.name, s.count, s.pctOfPrevious])).toEqual([
      ["guest_started", 100, null],
      ["signin_opened", 40, 40],
      ["signed_in", 20, 50],
      ["guest_claimed", 10, 50],
      ["published", 5, 50],
    ]);
  });

  it("uses 0% when the previous step is zero", () => {
    const funnel = buildFunnel({
      guest_started: 0,
      signin_opened: 3,
    });
    expect(funnel[1].pctOfPrevious).toBe(0);
  });
});
