import { clientBoundsFromEvents } from "@/lib/receipt/accept-batch";
import { GENESIS_PREV_HASH, hashBatch } from "@/lib/receipt/hash";
import { sha256HexWeb } from "@/lib/receipt/sha256-web";
import type { CharOrigin, EditEvent, TextLink } from "@/lib/receipt/types";
import { isBatchDelayed } from "./delay";
import {
  enqueueBatch,
  listQueuedBatches,
  removeBatch,
  removeBatchesForSession,
  updateBatch,
} from "./idb-queue";
import type { QueuedBatch, SyncStatus } from "./types";

export const FLUSH_INTERVAL_MS = 5_000;
export const IDLE_NEW_SESSION_MS = 30 * 60 * 1000;

export type PieceStateResponse = {
  text: string;
  origins: CharOrigin[];
  links: TextLink[];
  events: EditEvent[];
  lastAckSeq: number | null;
  lastSessionId: string | null;
  flags: {
    delayedCount: number;
    clockSuspectCount: number;
  };
};

type StatusListener = (status: SyncStatus) => void;
type SupersededListener = () => void;

type ClaimMessage = {
  type: "claimed";
  pieceId: string;
  sessionId: string;
};

function newLocalId(): string {
  return crypto.randomUUID();
}

function channelName(pieceId: string): string {
  return `longhand-piece-${pieceId}`;
}

export class EventSync {
  private pieceId: string;
  private sessionId: string | null = null;
  private seq = 0;
  private prevHash = GENESIS_PREV_HASH;
  private pending: EditEvent[] = [];
  private lastEventAt: number | null = null;
  private lastAckSeq: number | null = null;
  private clockSuspectCount = 0;
  private lastDelayed = false;
  private lastClockSuspect = false;
  private superseded = false;
  private discardedBatches = 0;
  private refused = false;
  private flushChain: Promise<void> = Promise.resolve();
  private writeChain: Promise<void> = Promise.resolve();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<StatusListener>();
  private supersededListeners = new Set<SupersededListener>();
  private online = typeof navigator === "undefined" ? true : navigator.onLine;
  private channel: BroadcastChannel | null = null;
  /** Ambient condition to store when a session starts. */
  private sessionCondition: string | null = null;

  constructor(pieceId: string) {
    this.pieceId = pieceId;
  }

  setSessionCondition(condition: string | null): void {
    this.sessionCondition = condition;
  }

  subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    void this.emitStatus();
    return () => {
      this.listeners.delete(listener);
    };
  }

  onSuperseded(listener: SupersededListener): () => void {
    this.supersededListeners.add(listener);
    return () => {
      this.supersededListeners.delete(listener);
    };
  }

  isSuperseded(): boolean {
    return this.superseded;
  }

  /** True when the server refused a batch (not a network failure). */
  hasRefusedBatches(): boolean {
    return this.refused;
  }

  private async emitStatus(): Promise<void> {
    const queued =
      this.superseded || !this.sessionId
        ? []
        : (await listQueuedBatches(this.pieceId)).filter(
            (b) => b.sessionId === this.sessionId,
          );
    const status: SyncStatus = {
      queuedCount: queued.length,
      lastAckSeq: this.lastAckSeq,
      lastSessionId: this.sessionId,
      delayedQueued: queued.filter(
        (b) => b.delayed || isBatchDelayed(b.createdAt),
      ).length,
      clockSuspectCount: this.clockSuspectCount,
      lastDelayed: this.lastDelayed,
      lastClockSuspect: this.lastClockSuspect,
      online: this.online,
      superseded: this.superseded,
      discardedBatches: this.discardedBatches,
      refused: this.refused,
    };
    for (const listener of this.listeners) {
      listener(status);
    }
  }

  async loadState(): Promise<PieceStateResponse> {
    const res = await fetch(`/api/pieces/${this.pieceId}/state`);
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      body = null;
    }
    if (!res.ok) {
      const detail =
        body &&
        typeof body === "object" &&
        "message" in body &&
        typeof (body as { message: unknown }).message === "string"
          ? (body as { message: string }).message
          : body &&
              typeof body === "object" &&
              "error" in body &&
              typeof (body as { error: unknown }).error === "string"
            ? (body as { error: string }).error
            : res.statusText;
      throw new Error(
        `GET /api/pieces/${this.pieceId}/state → ${res.status}: ${detail}`,
      );
    }
    const data = body as PieceStateResponse;
    this.clockSuspectCount = data.flags?.clockSuspectCount ?? 0;
    return data;
  }

  async startSession(condition?: string): Promise<string> {
    if (this.superseded) {
      throw new Error("session superseded");
    }
    const stored = condition ?? this.sessionCondition ?? undefined;
    const res = await fetch(`/api/pieces/${this.pieceId}/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(stored ? { condition: stored } : {}),
    });
    if (!res.ok) {
      throw new Error(`session ${res.status}`);
    }
    const data = (await res.json()) as { sessionId: string };
    this.sessionId = data.sessionId;
    this.seq = 0;
    this.prevHash = GENESIS_PREV_HASH;
    this.pending = [];
    this.lastEventAt = null;
    this.broadcastClaim(data.sessionId);
    await this.emitStatus();
    return data.sessionId;
  }

  /**
   * Queue events for the next batch. Rotates to a new session first when idle
   * past 30 minutes. Serialized so concurrent edits keep order.
   */
  pushEvents(events: EditEvent[]): void {
    if (events.length === 0 || this.superseded) return;
    this.writeChain = this.writeChain
      .then(async () => {
        if (this.superseded) return;
        if (this.shouldRotateSession()) {
          await this.flush();
          if (this.superseded) return;
          await this.startSession();
        }
        this.pending.push(...events);
        this.lastEventAt = Date.now();
      })
      .catch(() => {
        /* keep chain alive */
      });
  }

  /** True when idle long enough that the next edit should start a new session. */
  shouldRotateSession(now = Date.now()): boolean {
    if (this.lastEventAt === null) return false;
    return now - this.lastEventAt >= IDLE_NEW_SESSION_MS;
  }

  start(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, FLUSH_INTERVAL_MS);

    if (typeof window !== "undefined") {
      window.addEventListener("online", this.onOnline);
      window.addEventListener("offline", this.onOffline);
      document.addEventListener("visibilitychange", this.onVisibility);
      window.addEventListener("pagehide", this.onPageHide);
      this.openChannel();
    }
  }

  stop(): void {
    if (this.flushTimer !== null) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.onOnline);
      window.removeEventListener("offline", this.onOffline);
      document.removeEventListener("visibilitychange", this.onVisibility);
      window.removeEventListener("pagehide", this.onPageHide);
    }
    this.closeChannel();
  }

  private openChannel(): void {
    if (typeof BroadcastChannel === "undefined") return;
    this.closeChannel();
    this.channel = new BroadcastChannel(channelName(this.pieceId));
    this.channel.onmessage = (event: MessageEvent<ClaimMessage>) => {
      const data = event.data;
      if (!data || data.type !== "claimed") return;
      if (data.pieceId !== this.pieceId) return;
      // Ignore until this tab has claimed a session of its own.
      if (!this.sessionId) return;
      if (data.sessionId === this.sessionId) return;
      void this.markSuperseded("broadcast");
    };
  }

  private closeChannel(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }

  private broadcastClaim(sessionId: string): void {
    if (!this.channel) return;
    const message: ClaimMessage = {
      type: "claimed",
      pieceId: this.pieceId,
      sessionId,
    };
    this.channel.postMessage(message);
  }

  /**
   * Become read-only: discard this session's unsent queue after confirmation,
   * and stop accepting new events.
   */
  async markSuperseded(_source: "broadcast" | "server" = "server"): Promise<void> {
    if (this.superseded) return;
    this.superseded = true;
    this.pending = [];

    const sessionId = this.sessionId;
    if (sessionId) {
      this.discardedBatches += await removeBatchesForSession(
        this.pieceId,
        sessionId,
      );
    }

    await this.emitStatus();
    for (const listener of this.supersededListeners) {
      listener();
    }
  }

  private onOnline = () => {
    this.online = true;
    void this.flush({ keepalive: false });
  };

  private onOffline = () => {
    this.online = false;
    void this.emitStatus();
  };

  private onVisibility = () => {
    if (document.visibilityState === "hidden") {
      void this.flush({ keepalive: true });
    }
  };

  private onPageHide = () => {
    void this.flush({ keepalive: true });
  };

  async flush(options: { keepalive?: boolean } = {}): Promise<void> {
    if (this.superseded) {
      return this.flushChain;
    }
    this.flushChain = this.flushChain
      .then(async () => {
        if (this.superseded) return;
        await this.enqueuePending();
        await this.sendQueued(options.keepalive === true);
        await this.emitStatus();
      })
      .catch(() => {
        /* keep chain alive */
      });
    return this.flushChain;
  }

  private async enqueuePending(): Promise<void> {
    if (this.superseded || this.pending.length === 0 || !this.sessionId) {
      return;
    }

    const events = this.pending;
    this.pending = [];
    const seq = this.seq + 1;
    const prevHash = this.prevHash;
    const hash = await hashBatch(prevHash, seq, events, sha256HexWeb);
    const bounds = clientBoundsFromEvents(events);
    const batch: QueuedBatch = {
      id: newLocalId(),
      pieceId: this.pieceId,
      sessionId: this.sessionId,
      seq,
      events,
      prevHash,
      hash,
      clientTStart: bounds.clientTStart,
      clientTEnd: bounds.clientTEnd,
      createdAt: Date.now(),
      delayed: false,
    };

    await enqueueBatch(batch);
    this.seq = seq;
    this.prevHash = hash;
  }

  private async sendQueued(keepalive: boolean): Promise<void> {
    if (this.superseded || !this.sessionId) return;
    const queued = (await listQueuedBatches(this.pieceId)).filter(
      (b) => b.sessionId === this.sessionId,
    );
    for (const batch of queued) {
      if (this.superseded) break;
      const delayed = batch.delayed || isBatchDelayed(batch.createdAt);
      if (delayed && !batch.delayed) {
        batch.delayed = true;
        await updateBatch(batch);
      }

      const ok = await this.sendBatch(batch, keepalive);
      if (!ok) {
        break;
      }
    }
  }

  private async sendBatch(
    batch: QueuedBatch,
    keepalive: boolean,
  ): Promise<boolean> {
    try {
      const res = await fetch(`/api/pieces/${this.pieceId}/batches`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sessionId: batch.sessionId,
          seq: batch.seq,
          events: batch.events,
          prevHash: batch.prevHash,
          hash: batch.hash,
          delayed: batch.delayed,
          clientTStart: batch.clientTStart,
          clientTEnd: batch.clientTEnd,
        }),
        keepalive,
      });

      if (res.status === 200) {
        const data = (await res.json()) as {
          clockSuspect?: boolean;
          delayed?: boolean;
          seq?: number;
        };
        await removeBatch(batch.id);
        this.lastAckSeq = batch.seq;
        this.lastDelayed = Boolean(data.delayed ?? batch.delayed);
        this.lastClockSuspect = Boolean(data.clockSuspect);
        if (this.lastClockSuspect) {
          this.clockSuspectCount += 1;
        }
        this.refused = false;
        return true;
      }

      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        body = null;
      }

      if (res.status === 409) {
        const reason =
          body &&
          typeof body === "object" &&
          "reason" in body &&
          typeof (body as { reason: unknown }).reason === "string"
            ? (body as { reason: string }).reason
            : undefined;
        if (reason === "superseded") {
          await this.markSuperseded("server");
          return false;
        }
        console.error("[longhand] batch refused", res.status, body);
        this.refused = true;
        return false;
      }

      // Any other 4xx/5xx: refuse permanently until a later ack clears it.
      if (res.status >= 400) {
        console.error("[longhand] batch refused", res.status, body);
        this.refused = true;
        return false;
      }

      return false;
    } catch {
      // Network failure: keep retrying as "saving"; do not mark refused.
      return false;
    }
  }
}
