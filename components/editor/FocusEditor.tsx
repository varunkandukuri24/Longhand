"use client";

import { EditorDebugPanel } from "@/components/editor/EditorDebugPanel";
import {
  applyDiffToOrigins,
  diffText,
  eventsFromDiff,
} from "@/lib/editor/diff";
import {
  shouldBlockBeforeInput,
  shouldBlockKeydown,
} from "@/lib/editor/no-backspace";
import type { CharOrigin, EditEvent } from "@/lib/receipt/types";
import { EventSync, IDLE_NEW_SESSION_MS } from "@/lib/sync/event-sync";
import type { SyncStatus } from "@/lib/sync/types";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
  type FormEvent,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

const TIMER_OPTIONS = [10, 15, 25] as const;
const IS_DEV = process.env.NODE_ENV === "development";

type FocusEditorProps = {
  pieceId: string;
};

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatCountdown(ms: number): string {
  const clamped = Math.max(0, ms);
  return formatElapsed(clamped);
}

export function FocusEditor({ pieceId }: FocusEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const prevValueRef = useRef("");
  const originsRef = useRef<CharOrigin[]>([]);
  const eventsRef = useRef<EditEvent[]>([]);
  const composingRef = useRef(false);
  const lastInputTypeRef = useRef<string | undefined>(undefined);
  const sessionStartRef = useRef<number | null>(null);
  const enteredFullscreenRef = useRef(false);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noBackspaceRef = useRef(false);
  const syncRef = useRef<EventSync | null>(null);
  const readyRef = useRef(false);
  const lastLocalEventAtRef = useRef<number | null>(null);

  const [value, setValue] = useState("");
  const [controlsVisible, setControlsVisible] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [noBackspace, setNoBackspace] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState<
    (typeof TIMER_OPTIONS)[number] | null
  >(null);
  const timerEndsAtRef = useRef<number | null>(null);
  const [timerRemainingMs, setTimerRemainingMs] = useState<number | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugSnapshot, setDebugSnapshot] = useState<{
    events: EditEvent[];
    origins: CharOrigin[];
  }>({ events: [], origins: [] });
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);
  const [superseded, setSuperseded] = useState(false);

  useEffect(() => {
    noBackspaceRef.current = noBackspace;
  }, [noBackspace]);

  const exposeEvents = useCallback(() => {
    if (IS_DEV) {
      window.__longhandEvents = eventsRef.current;
    }
  }, []);

  const syncDebugSnapshot = useCallback(() => {
    if (!IS_DEV) {
      return;
    }
    setDebugSnapshot({
      events: eventsRef.current.slice(),
      origins: originsRef.current.slice(),
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;
    setBootError(null);
    setSuperseded(false);

    const sync = new EventSync(pieceId);
    syncRef.current = sync;
    const unsubscribe = sync.subscribe(setSyncStatus);
    const unsubSuperseded = sync.onSuperseded(() => {
      setSuperseded(true);
      readyRef.current = false;
    });
    sync.start();

    void (async () => {
      try {
        const state = await sync.loadState();
        if (cancelled) return;

        prevValueRef.current = state.text;
        originsRef.current = state.origins.slice();
        eventsRef.current = state.events.slice();
        setValue(state.text);
        exposeEvents();
        syncDebugSnapshot();

        // Flush any batches left in IndexedDB from a prior visit.
        await sync.flush();
        if (cancelled) return;

        await sync.startSession();
        if (cancelled) return;
        sessionStartRef.current = Date.now();
        lastLocalEventAtRef.current = null;
        readyRef.current = true;
        setBootError(null);
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error ? err.message : "Could not load this piece.";
          setBootError(message);
          readyRef.current = false;
        }
      }
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      unsubscribe();
      unsubSuperseded();
      sync.stop();
      syncRef.current = null;
    };
  }, [pieceId, bootAttempt, exposeEvents, syncDebugSnapshot]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  const scheduleControlsFade = useCallback(() => {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
    }
    fadeTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      fadeTimerRef.current = null;
    }, 2000);
  }, []);

  const enterFullscreenOnce = useCallback(() => {
    if (enteredFullscreenRef.current) {
      return;
    }
    if (
      typeof document === "undefined" ||
      !document.documentElement.requestFullscreen
    ) {
      return;
    }
    if (document.fullscreenElement) {
      enteredFullscreenRef.current = true;
      return;
    }
    enteredFullscreenRef.current = true;
    void document.documentElement.requestFullscreen().catch(() => {
      enteredFullscreenRef.current = false;
    });
  }, []);

  const commitDiff = useCallback(
    (next: string, inputType: string | undefined) => {
      if (!readyRef.current || syncRef.current?.isSuperseded()) {
        return;
      }

      const prev = prevValueRef.current;
      if (prev === next) {
        return;
      }

      const diff = diffText(prev, next);
      if (diff.removed.length === 0 && diff.inserted.length === 0) {
        prevValueRef.current = next;
        return;
      }

      const now = Date.now();
      const lastLocal = lastLocalEventAtRef.current;
      if (
        lastLocal !== null &&
        now - lastLocal >= IDLE_NEW_SESSION_MS
      ) {
        sessionStartRef.current = now;
      }

      const start = sessionStartRef.current ?? now;
      sessionStartRef.current = start;
      const t = now - start;
      const newEvents = eventsFromDiff(diff, inputType, t);
      eventsRef.current = [...eventsRef.current, ...newEvents];
      originsRef.current = applyDiffToOrigins(
        originsRef.current,
        diff,
        inputType,
      );
      prevValueRef.current = next;
      lastLocalEventAtRef.current = now;
      syncRef.current?.pushEvents(newEvents);
      exposeEvents();
      syncDebugSnapshot();
    },
    [exposeEvents, syncDebugSnapshot],
  );

  useEffect(() => {
    exposeEvents();
    const id = window.setInterval(() => {
      const start = sessionStartRef.current;
      if (start !== null) {
        setElapsedMs(Date.now() - start);
      }
      if (timerEndsAtRef.current !== null) {
        setTimerRemainingMs(timerEndsAtRef.current - Date.now());
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [exposeEvents]);

  useEffect(() => {
    return () => {
      if (fadeTimerRef.current) {
        clearTimeout(fadeTimerRef.current);
      }
    };
  }, []);

  // Native beforeinput: React's onBeforeInput polyfill never sees deletion inputTypes.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) {
      return;
    }

    const onBeforeInput = (event: Event) => {
      const inputEvent = event as InputEvent;
      lastInputTypeRef.current = inputEvent.inputType;

      if (
        noBackspaceRef.current &&
        shouldBlockBeforeInput(inputEvent.inputType)
      ) {
        event.preventDefault();
      }
    };

    el.addEventListener("beforeinput", onBeforeInput);
    return () => {
      el.removeEventListener("beforeinput", onBeforeInput);
    };
  }, []);

  useEffect(() => {
    if (!IS_DEV) {
      return;
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") {
        event.preventDefault();
        setDebugOpen((open) => {
          const next = !open;
          if (next) {
            setDebugSnapshot({
              events: eventsRef.current.slice(),
              origins: originsRef.current.slice(),
            });
          }
          return next;
        });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onCompositionStart = () => {
    composingRef.current = true;
  };

  const onCompositionEnd = (event: CompositionEvent<HTMLTextAreaElement>) => {
    composingRef.current = false;
    const next = event.currentTarget.value;
    setValue(next);
    commitDiff(next, lastInputTypeRef.current);
    scheduleControlsFade();
  };

  const onInput = (event: FormEvent<HTMLTextAreaElement>) => {
    const next = event.currentTarget.value;
    setValue(next);

    if (composingRef.current) {
      return;
    }

    const native = event.nativeEvent as InputEvent;
    const inputType = native.inputType || lastInputTypeRef.current;
    commitDiff(next, inputType);
    scheduleControlsFade();
  };

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    enterFullscreenOnce();

    if (
      noBackspaceRef.current &&
      shouldBlockKeydown({
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
      })
    ) {
      event.preventDefault();
      return;
    }

    if (event.key === "Escape" && document.fullscreenElement) {
      void document.exitFullscreen();
    }
  };

  const onMouseDown = () => {
    enterFullscreenOnce();
  };

  const onMouseMove = () => {
    showControls();
  };

  const onPageClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      textareaRef.current?.focus();
    }
  };

  return (
    <div
      className="relative flex min-h-full w-full flex-1 items-center justify-center bg-room-night px-4 py-8"
      data-piece-id={pieceId}
      onMouseMove={onMouseMove}
    >
      <div
        className={[
          "pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between px-5 py-4 transition-opacity duration-500",
          controlsVisible ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        <div className="pointer-events-auto flex flex-col gap-2 font-ui text-[12px] text-page/70">
          <div className="flex items-center gap-3">
            <span>Timer</span>
            <div className="flex gap-2">
              {TIMER_OPTIONS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  className={[
                    "underline-offset-2 hover:underline",
                    timerMinutes === minutes ? "text-lamp" : "",
                  ].join(" ")}
                  onClick={() => {
                    setTimerMinutes(minutes);
                    timerEndsAtRef.current = Date.now() + minutes * 60 * 1000;
                    setTimerRemainingMs(minutes * 60 * 1000);
                    showControls();
                  }}
                >
                  {minutes}m
                </button>
              ))}
              {timerMinutes !== null ? (
                <button
                  type="button"
                  className="underline-offset-2 hover:underline"
                  onClick={() => {
                    setTimerMinutes(null);
                    timerEndsAtRef.current = null;
                    setTimerRemainingMs(null);
                    showControls();
                  }}
                >
                  off
                </button>
              ) : null}
              {timerMinutes !== null && timerRemainingMs !== null ? (
                <span className="text-lamp">
                  {formatCountdown(timerRemainingMs)}
                </span>
              ) : null}
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={noBackspace}
              onChange={(e) => {
                const checked = e.target.checked;
                noBackspaceRef.current = checked;
                setNoBackspace(checked);
                showControls();
              }}
              className="accent-lamp"
            />
            <span>No backspace</span>
          </label>
        </div>

        <div className="pointer-events-none font-ui text-[12px] text-page/70">
          <span>{formatElapsed(elapsedMs)}</span>
          <span className="mx-2 text-page/40">·</span>
          <span>
            {syncStatus && syncStatus.queuedCount > 0 ? "saving" : "saved"}
          </span>
        </div>
      </div>

      <div
        className="relative h-[min(620px,calc(100vh-4rem))] w-full max-w-[820px] rounded-[6px] bg-page shadow-page"
        onClick={onPageClick}
      >
        {superseded ? (
          <p className="pointer-events-none absolute inset-x-0 top-3 z-10 text-center font-ui text-[12px] text-ink/55">
            Open in another window. Refresh to continue here.
          </p>
        ) : null}
        {bootError ? (
          <div className="flex h-full flex-col justify-center gap-4 px-12 py-10">
            <p className="font-ui text-[13px] text-ink/80">
              Could not load this piece.
            </p>
            <p className="font-ui text-[12px] text-ink/60 break-words">
              {bootError}
            </p>
            <button
              type="button"
              className="w-fit font-ui text-[12px] text-lamp underline-offset-2 hover:underline"
              onClick={() => setBootAttempt((n) => n + 1)}
            >
              Retry
            </button>
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            readOnly={superseded}
            onCompositionStart={onCompositionStart}
            onCompositionEnd={onCompositionEnd}
            onInput={onInput}
            onChange={onChange}
            onKeyDown={onKeyDown}
            onMouseDown={onMouseDown}
            spellCheck
            autoCapitalize="off"
            autoCorrect="off"
            className={[
              "h-full w-full resize-none rounded-[6px] bg-transparent px-12 py-10 font-writing text-[21px] leading-[1.75] text-ink caret-cursor outline-none",
              superseded ? "pt-12" : "",
            ].join(" ")}
            aria-label="Writing page"
          />
        )}
      </div>

      {IS_DEV && debugOpen ? (
        <EditorDebugPanel
          events={debugSnapshot.events}
          origins={debugSnapshot.origins}
          value={value}
          syncStatus={syncStatus}
          loadError={bootError}
        />
      ) : null}
    </div>
  );
}
