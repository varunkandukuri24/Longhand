import { auth } from "@/auth";
import { db } from "@/db";
import { eventBatches, pieces, sessions } from "@/db/schema";
import { rebuildDraftTextFromBatches } from "@/lib/pieces/draft-text";
import { getOwnedPiece } from "@/lib/pieces/ownership";
import {
  clientBoundsFromEvents,
  decideBatchAcceptance,
} from "@/lib/receipt/accept-batch";
import {
  applyEventsStrict,
  InvalidEventError,
  MAX_BATCH_BODY_BYTES,
  MAX_EVENTS_PER_BATCH,
} from "@/lib/receipt/apply-events-strict";
import { isEditEvent } from "@/lib/receipt/edit-event";
import { hashBatch } from "@/lib/receipt/hash";
import { sha256HexNode } from "@/lib/receipt/sha256-node";
import type { EditEvent } from "@/lib/receipt/types";
import { and, desc, eq } from "drizzle-orm";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type BatchBody = {
  sessionId?: string;
  seq?: number;
  events?: EditEvent[];
  prevHash?: string;
  hash?: string;
  delayed?: boolean;
  clientTStart?: number;
  clientTEnd?: number;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const contentLength = request.headers.get("content-length");
  if (
    contentLength !== null &&
    Number.parseInt(contentLength, 10) > MAX_BATCH_BODY_BYTES
  ) {
    return Response.json({ error: "too_large" }, { status: 413 });
  }

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }
  if (raw.length > MAX_BATCH_BODY_BYTES) {
    return Response.json({ error: "too_large" }, { status: 413 });
  }

  let body: BatchBody;
  try {
    body = JSON.parse(raw) as BatchBody;
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const { id: pieceId } = await context.params;
  const piece = await getOwnedPiece(pieceId, session.user.id);
  if (!piece) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (piece.status === "published") {
    return Response.json(
      { error: "conflict", reason: "published" },
      { status: 409 },
    );
  }

  const {
    sessionId,
    seq,
    events,
    prevHash,
    hash,
    delayed = false,
  } = body;

  if (
    typeof sessionId !== "string" ||
    typeof seq !== "number" ||
    !Number.isInteger(seq) ||
    seq < 1 ||
    !Array.isArray(events) ||
    !events.every(isEditEvent) ||
    events.length === 0 ||
    typeof prevHash !== "string" ||
    typeof hash !== "string" ||
    typeof delayed !== "boolean"
  ) {
    return Response.json({ error: "invalid_body" }, { status: 400 });
  }

  if (events.length > MAX_EVENTS_PER_BATCH) {
    return Response.json(
      { error: "invalid_event", reason: "invalid_event" },
      { status: 422 },
    );
  }

  const boundsFromEvents = clientBoundsFromEvents(events);
  const clientTStart =
    typeof body.clientTStart === "number"
      ? body.clientTStart
      : boundsFromEvents.clientTStart;
  const clientTEnd =
    typeof body.clientTEnd === "number"
      ? body.clientTEnd
      : boundsFromEvents.clientTEnd;

  const recomputedHash = await hashBatch(prevHash, seq, events, sha256HexNode);
  const serverNow = new Date();

  const result = await db.transaction(async (tx) => {
    const [pieceRow] = await tx
      .select({
        id: pieces.id,
        activeSessionId: pieces.activeSessionId,
        draftText: pieces.draftText,
      })
      .from(pieces)
      .where(eq(pieces.id, pieceId))
      .limit(1)
      .for("update");

    if (!pieceRow) {
      return { kind: "not_found" as const };
    }

    const [writingSession] = await tx
      .select({ id: sessions.id, pieceId: sessions.pieceId })
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), eq(sessions.pieceId, pieceId)))
      .limit(1);

    if (!writingSession) {
      return { kind: "not_found" as const };
    }

    const [existingSameSeq] = await tx
      .select({ hash: eventBatches.hash })
      .from(eventBatches)
      .where(
        and(eq(eventBatches.sessionId, sessionId), eq(eventBatches.seq, seq)),
      )
      .limit(1);

    // Superseded sessions must never apply new batches. Idempotent retries of
    // batches already stored while active still return 200 without storing.
    if (pieceRow.activeSessionId !== sessionId) {
      if (existingSameSeq && existingSameSeq.hash === hash) {
        return { kind: "idempotent" as const, seq, hash };
      }
      return { kind: "conflict" as const, reason: "superseded" as const };
    }

    const [last] = await tx
      .select({
        seq: eventBatches.seq,
        hash: eventBatches.hash,
        serverReceivedAt: eventBatches.serverReceivedAt,
      })
      .from(eventBatches)
      .where(eq(eventBatches.sessionId, sessionId))
      .orderBy(desc(eventBatches.seq))
      .limit(1);

    const decision = decideBatchAcceptance({
      incoming: {
        seq,
        prevHash,
        hash,
        events,
        delayed,
        clientTStart,
        clientTEnd,
        recomputedHash,
      },
      last: last ?? null,
      existingSameSeq: existingSameSeq ?? null,
      serverNow,
    });

    if (decision.action === "idempotent") {
      return { kind: "idempotent" as const, seq, hash };
    }

    if (decision.action === "conflict") {
      return { kind: "conflict" as const, reason: decision.reason };
    }

    let draftText = pieceRow.draftText;
    if (draftText === null) {
      draftText = await rebuildDraftTextFromBatches(tx, pieceId);
    }

    let nextDraft: string;
    try {
      nextDraft = applyEventsStrict(draftText, events).text;
    } catch (err) {
      if (err instanceof InvalidEventError) {
        return { kind: "invalid_event" as const };
      }
      throw err;
    }

    const [stored] = await tx
      .insert(eventBatches)
      .values({
        sessionId,
        seq,
        events,
        prevHash,
        hash,
        clientTStart,
        clientTEnd,
        serverReceivedAt: serverNow,
        delayed,
        clockSuspect: decision.clockSuspect,
      })
      .returning({
        id: eventBatches.id,
        seq: eventBatches.seq,
        hash: eventBatches.hash,
        delayed: eventBatches.delayed,
        clockSuspect: eventBatches.clockSuspect,
        serverReceivedAt: eventBatches.serverReceivedAt,
      });

    await tx
      .update(pieces)
      .set({ draftText: nextDraft, updatedAt: serverNow })
      .where(eq(pieces.id, pieceId));

    return { kind: "stored" as const, batch: stored };
  });

  if (result.kind === "not_found") {
    return Response.json({ error: "session_not_found" }, { status: 404 });
  }

  if (result.kind === "invalid_event") {
    return Response.json(
      { error: "invalid_event", reason: "invalid_event" },
      { status: 422 },
    );
  }

  if (result.kind === "conflict") {
    return Response.json(
      { error: "conflict", reason: result.reason },
      { status: 409 },
    );
  }

  if (result.kind === "idempotent") {
    return Response.json({
      ok: true,
      idempotent: true,
      seq: result.seq,
      hash: result.hash,
    });
  }

  return Response.json({
    ok: true,
    idempotent: false,
    seq: result.batch.seq,
    hash: result.batch.hash,
    delayed: result.batch.delayed,
    clockSuspect: result.batch.clockSuspect,
    serverReceivedAt: result.batch.serverReceivedAt.toISOString(),
  });
}
