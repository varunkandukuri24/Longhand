import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";

const databaseUrl = process.env.DATABASE_URL;

const authMock = vi.hoisted(() => ({
  userId: "" as string,
}));

vi.mock("@/auth", () => ({
  auth: async () =>
    authMock.userId
      ? { user: { id: authMock.userId, email: "pane@test" } }
      : null,
}));

describe.skipIf(!databaseUrl)("loadYourPieces", () => {
  const ownerId = `pane-o-${crypto.randomUUID()}`;
  const otherId = `pane-x-${crypto.randomUUID()}`;
  let ownerPieceId = "";

  beforeAll(async () => {
    await db.insert(schema.users).values({
      id: ownerId,
      email: `${ownerId}@example.test`,
      name: "Pane Owner",
      handle: `po${ownerId.replace(/[^a-z0-9]/g, "").slice(-8)}`,
    });
    await db.insert(schema.users).values({
      id: otherId,
      email: `${otherId}@example.test`,
      name: "Pane Other",
      handle: `px${otherId.replace(/[^a-z0-9]/g, "").slice(-8)}`,
    });

    const [owned] = await db
      .insert(schema.pieces)
      .values({
        userId: ownerId,
        title: "Owner piece",
        status: "draft",
        draftText: "Hello from the owner",
      })
      .returning({ id: schema.pieces.id });
    ownerPieceId = owned.id;

    await db.insert(schema.pieces).values({
      userId: otherId,
      title: "Other piece",
      status: "draft",
      draftText: "Should not appear",
    });

    authMock.userId = ownerId;
  });

  afterAll(async () => {
    await db.delete(schema.pieces).where(eq(schema.pieces.userId, ownerId));
    await db.delete(schema.pieces).where(eq(schema.pieces.userId, otherId));
    await db.delete(schema.users).where(eq(schema.users.id, ownerId));
    await db.delete(schema.users).where(eq(schema.users.id, otherId));
  });

  it("returns only the caller's pieces", async () => {
    const { loadYourPieces } = await import("./list-pieces");
    const pieces = await loadYourPieces();
    expect(pieces.every((p) => p.id === ownerPieceId || p.label === "Owner piece")).toBe(
      true,
    );
    expect(pieces.some((p) => p.label === "Other piece")).toBe(false);
    expect(pieces.some((p) => p.id === ownerPieceId)).toBe(true);
  });
});
