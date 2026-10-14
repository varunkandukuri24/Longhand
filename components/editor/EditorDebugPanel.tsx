"use client";

import { applyEvents } from "@/lib/receipt/apply-events";
import {
  computeReceipt,
  liveBatchesFromEvents,
} from "@/lib/receipt/compute-receipt";
import type { CharOrigin, EditEvent } from "@/lib/receipt/types";
import type { SyncStatus } from "@/lib/sync/types";

type EditorDebugPanelProps = {
  events: readonly EditEvent[];
  origins: readonly CharOrigin[];
  value: string;
  sessionStartedAt: number | null;
  delayedBatchCount: number;
  syncStatus: SyncStatus | null;
  loadError?: string | null;
};

function countOrigins(origins: readonly CharOrigin[]) {
  let typed = 0;
  let pasted = 0;
  let quoted = 0;
  for (const origin of origins) {
    if (origin === "typed") typed += 1;
    else if (origin === "pasted") pasted += 1;
    else quoted += 1;
  }
  return { typed, pasted, quoted };
}

function previewText(text: string): string {
  return text.length <= 20 ? text : `${text.slice(0, 20)}…`;
}

function formatMs(ms: number): string {
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  if (ms < 3_600_000) return `${(ms / 60_000).toFixed(1)}m`;
  return `${(ms / 3_600_000).toFixed(1)}h`;
}

function formatShare(share: number): string {
  return `${(share * 100).toFixed(0)}%`;
}

export function EditorDebugPanel({
  events,
  origins,
  value,
  sessionStartedAt,
  delayedBatchCount,
  syncStatus,
  loadError = null,
}: EditorDebugPanelProps) {
  const recent = events.slice(-10);
  const counts = countOrigins(origins);
  const rebuild = applyEvents(events).text;
  const match = rebuild === value;

  const now = Date.now();
  const batches = liveBatchesFromEvents(events, {
    sessionStartedAt: sessionStartedAt ?? now,
    now,
    delayedBatchCount,
  });
  const receipt = computeReceipt(batches, value);

  return (
    <aside
      className="pointer-events-none absolute bottom-4 left-4 z-20 max-h-[40vh] w-[min(360px,calc(100vw-2rem))] overflow-auto rounded-[6px] bg-page/95 p-3 font-ui text-[11px] leading-relaxed text-ink shadow-page"
      aria-label="Event debug"
    >
      {loadError ? (
        <p className="mb-2 break-words text-cursor">load error: {loadError}</p>
      ) : null}
      <p className="text-ink/60">events {events.length}</p>
      <p className="mt-1">
        typed {counts.typed} · pasted {counts.pasted} · quoted {counts.quoted}
      </p>
      <p className={match ? "mt-1 text-ink/70" : "mt-1 text-cursor"}>
        {match ? "rebuild OK" : "rebuild MISMATCH"}
      </p>
      <div className="mt-2 space-y-1 border-t border-ink/10 pt-2 text-ink/70">
        <p className="text-ink/50">receipt v{receipt.version}</p>
        <p>active {formatMs(receipt.activeWritingTimeMs)}</p>
        <p>elapsed {formatMs(receipt.elapsedSpanMs)}</p>
        <p>sessions {receipt.sessionCount}</p>
        <p>
          typed {formatShare(receipt.typedShare)} · pasted{" "}
          {formatShare(receipt.pastedShare)} · quoted{" "}
          {formatShare(receipt.quotedShare)}
        </p>
        <p>revision {receipt.revisionRatio.toFixed(2)}x</p>
        <p>words {receipt.wordCount}</p>
        <p>
          fast stretches {receipt.fastStretchCount} · uniform runs{" "}
          {receipt.uniformTypingRunCount}
        </p>
        <p>delayed batches {receipt.delayedBatchCount}</p>
      </div>
      {syncStatus ? (
        <div className="mt-2 space-y-1 border-t border-ink/10 pt-2 text-ink/70">
          <p>sync {syncStatus.online ? "online" : "offline"}</p>
          <p>queued {syncStatus.queuedCount}</p>
          <p>
            last ack seq{" "}
            {syncStatus.lastAckSeq === null ? "—" : syncStatus.lastAckSeq}
          </p>
          <p>
            delayed{" "}
            {syncStatus.lastDelayed || syncStatus.delayedQueued > 0
              ? `yes (${syncStatus.delayedQueued} queued)`
              : "no"}
          </p>
          <p>
            clock_suspect{" "}
            {syncStatus.lastClockSuspect || syncStatus.clockSuspectCount > 0
              ? `yes (${syncStatus.clockSuspectCount})`
              : "no"}
          </p>
          <p>superseded {syncStatus.superseded ? "yes" : "no"}</p>
          <p>discarded batches {syncStatus.discardedBatches}</p>
        </div>
      ) : null}
      <ul className="mt-2 space-y-1 border-t border-ink/10 pt-2">
        {recent.length === 0 ? (
          <li className="text-ink/50">no events</li>
        ) : (
          recent.map((event, index) => (
            <li key={`${event.t}-${event.type}-${event.pos}-${index}`}>
              {event.type} @{event.pos} len={event.len} “{previewText(event.text)}”
            </li>
          ))
        )}
      </ul>
    </aside>
  );
}
