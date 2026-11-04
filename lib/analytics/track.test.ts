import { beforeEach, describe, expect, it, vi } from "vitest";

const insertValues = vi.fn();

vi.mock("@/db", () => ({
  db: {
    insert: () => ({
      values: insertValues,
    }),
  },
}));

vi.mock("@/db/schema", () => ({
  analyticsEvents: {},
}));

describe("track / validateTrackInput", () => {
  beforeEach(() => {
    insertValues.mockReset();
    insertValues.mockResolvedValue(undefined);
  });

  it("rejects unknown event names", async () => {
    const { track, validateTrackInput } = await import("./track");
    expect(validateTrackInput("not_an_event", {})).toEqual({ ok: false });
    expect(await track("not_an_event" as never)).toBe(false);
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("rejects unknown props and overlong strings", async () => {
    const { track, validateTrackInput } = await import("./track");
    expect(
      validateTrackInput("signin_opened", { reason: "empty", extra: 1 }),
    ).toEqual({ ok: false });
    expect(
      validateTrackInput("limit_hit", { kind: "words", note: "x".repeat(40) }),
    ).toEqual({ ok: false });
    expect(validateTrackInput("limit_hit", { kind: "other" })).toEqual({
      ok: false,
    });
    expect(await track("published", { props: { visibility: "public" } as never })).toBe(
      false,
    );
    expect(insertValues).not.toHaveBeenCalled();
  });

  it("accepts allowlisted props and inserts a row", async () => {
    const { track, validateTrackInput } = await import("./track");
    const ok = validateTrackInput("published", {
      visibility: "private",
      tier: "hand",
      words: "under 100",
    });
    expect(ok.ok).toBe(true);

    expect(
      await track("published", {
        userId: "user-1",
        props: {
          visibility: "private",
          tier: "hand",
          words: "under 100",
        },
      }),
    ).toBe(true);
    expect(insertValues).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "published",
        userId: "user-1",
        guestId: null,
        props: {
          visibility: "private",
          tier: "hand",
          words: "under 100",
        },
      }),
    );
  });

  it("never throws when the database fails", async () => {
    insertValues.mockRejectedValueOnce(new Error("db down"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { track } = await import("./track");
    await expect(track("guest_started")).resolves.toBe(false);
    spy.mockRestore();
  });
});
