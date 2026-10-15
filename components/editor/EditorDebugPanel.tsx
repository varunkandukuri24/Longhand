"use client";

import { applyEvents } from "@/lib/receipt/apply-events";
import {
  computeReceipt,
  liveBatchesFromEvents,
} from "@/lib/receipt/compute-receipt";
import type { CharOrigin, EditEvent } from "@/lib/receipt/types";
import {
  CONDITIONS,
  LIGHTS,
  type Condition,
  type Light,
  type WindowSide,
} from "@/lib/scene";
import type { SyncStatus } from "@/lib/sync/types";

type EditorDebugPanelProps = {
  events: readonly EditEvent[];
  origins: readonly CharOrigin[];
  value: string;
  sessionStartedAt: number | null;
  delayedBatchCount: number;
  syncStatus: SyncStatus | null;
  loadError?: string | null;
  sceneLight: Light;
  sceneCondition: Condition;
  sceneSourceLabel: string;
  windowSide: WindowSide;
  debugOverride: { light: Light; condition: Condition } | null;
  onDebugOverride: (
    override: { light: Light; condition: Condition } | null,
  ) => void;
  onWindowSideChange: (side: WindowSide) => void;
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
  sceneLight,
  sceneCondition,
  sceneSourceLabel,
  windowSide,
  debugOverride,
  onDebugOverride,
  onWindowSideChange,
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
      className="pointer-events-auto fixed bottom-16 left-4 z-20 max-h-[40vh] w-[min(360px,calc(100vw-2rem))] overflow-auto rounded-[6px] border border-[var(--popover-border)] bg-white p-3 font-ui text-[11px] leading-relaxed text-ink shadow-[var(--shadow-popover)]"
      aria-label="Event debug"
    >
      {loadError ? (
        <p className="mb-2 break-words text-caret">load error: {loadError}</p>
      ) : null}
      <p className="text-label">events {events.length}</p>
      <p className="mt-1">
        typed {counts.typed} · pasted {counts.pasted} · quoted {counts.quoted}
      </p>
      <p className={match ? "mt-1 text-label" : "mt-1 text-caret"}>
        {match ? "rebuild OK" : "rebuild MISMATCH"}
      </p>

      <div className="mt-2 space-y-1 border-t border-[var(--popover-border)] pt-2 text-label">
        <p>scene</p>
        <p className="text-ink">
          light {sceneLight} · condition {sceneCondition}
        </p>
        <p className="text-ink">source {sceneSourceLabel}</p>
        {debugOverride ? (
          <p>debug preview (this tab only, not saved)</p>
        ) : null}
        <p>
          window{" "}
          <button
            type="button"
            className={windowSide === "left" ? "text-ink underline" : ""}
            onClick={() => onWindowSideChange("left")}
          >
            left
          </button>{" "}
          /{" "}
          <button
            type="button"
            className={windowSide === "right" ? "text-ink underline" : ""}
            onClick={() => onWindowSideChange("right")}
          >
            right
          </button>
        </p>
        <p>scene picker (preview only)</p>
        <div className="flex flex-wrap gap-1 text-ink">
          <button
            type="button"
            className={
              debugOverride === null ? "underline underline-offset-2" : ""
            }
            onClick={() => onDebugOverride(null)}
          >
            live
          </button>
          {LIGHTS.map((light) =>
            CONDITIONS.map((condition) => {
              const active =
                debugOverride?.light === light &&
                debugOverride?.condition === condition;
              return (
                <button
                  key={`${light}-${condition}`}
                  type="button"
                  className={active ? "underline underline-offset-2" : ""}
                  onClick={() => onDebugOverride({ light, condition })}
                >
                  {light}/{condition}
                </button>
              );
            }),
          )}
        </div>
      </div>

      <div className="mt-2 space-y-1 border-t border-[var(--popover-border)] pt-2 text-label">
        <p>receipt v{receipt.version}</p>
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
        <p>delayed batches {receipt.delayedBatchCount}</p>
      </div>
      {syncStatus ? (
        <div className="mt-2 space-y-1 border-t border-[var(--popover-border)] pt-2 text-label">
          <p>sync {syncStatus.online ? "online" : "offline"}</p>
          <p>queued {syncStatus.queuedCount}</p>
          <p>
            last ack seq{" "}
            {syncStatus.lastAckSeq === null ? "—" : syncStatus.lastAckSeq}
          </p>
          <p>superseded {syncStatus.superseded ? "yes" : "no"}</p>
        </div>
      ) : null}
      <ul className="mt-2 space-y-1 border-t border-[var(--popover-border)] pt-2">
        {recent.length === 0 ? (
          <li className="text-label">no events</li>
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
