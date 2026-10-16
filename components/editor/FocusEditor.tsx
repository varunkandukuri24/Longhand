"use client";

import { saveWindowSide } from "@/app/actions/window-side";
import { EditorControls } from "@/components/editor/EditorControls";
import { EditorDebugPanel } from "@/components/editor/EditorDebugPanel";
import { PublishSheet } from "@/components/editor/PublishSheet";
import {
  EDITOR_TOP_OFFSET_PX,
  PaperPage,
} from "@/components/scene/PaperPage";
import { useAmbientSceneContext } from "@/components/scene/ambient-context";
import { ResponseLine } from "@/components/source/ResponseLine";
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
import { captionFor, type WindowSide } from "@/lib/scene";
import { SCENE_PRESET_KEY } from "@/lib/scene/use-ambient-scene";
import { EventSync, IDLE_NEW_SESSION_MS } from "@/lib/sync/event-sync";
import type { SyncStatus } from "@/lib/sync/types";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type CompositionEvent,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type PointerEventHandler,
} from "react";
import { createPortal } from "react-dom";

const TIMER_OPTIONS = [10, 15, 25] as const;
const IS_DEV = process.env.NODE_ENV === "development";

type PublishedView = {
  slug: string;
  title: string;
  finalText: string;
};

type ResponseSource = {
  url: string;
  title: string;
  site: string;
};

type FocusEditorProps = {
  pieceId: string;
  initialTitle?: string;
  published?: PublishedView;
  source?: ResponseSource | null;
  initialWindowSide?: WindowSide;
};

function formatBarDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

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

export function FocusEditor(props: FocusEditorProps) {
  const paperPointerDownRef = useRef<PointerEventHandler<HTMLDivElement> | null>(
    null,
  );
  const [chromeHost, setChromeHost] = useState<HTMLDivElement | null>(null);

  return (
    <PaperPage
      topOffsetPx={EDITOR_TOP_OFFSET_PX}
      initialWindowSide={props.initialWindowSide ?? "left"}
      slide
      onPointerDown={(event) => {
        paperPointerDownRef.current?.(event);
      }}
      chrome={<div ref={setChromeHost} />}
    >
      <FocusEditorBody
        {...props}
        chromeHost={chromeHost}
        bindPaperPointerDown={(handler) => {
          paperPointerDownRef.current = handler;
        }}
      />
    </PaperPage>
  );
}

function FocusEditorBody({
  pieceId,
  initialTitle = "",
  published,
  source = null,
  bindPaperPointerDown,
  chromeHost,
}: FocusEditorProps & {
  bindPaperPointerDown: (
    handler: PointerEventHandler<HTMLDivElement> | null,
  ) => void;
  chromeHost: HTMLDivElement | null;
}) {
  const router = useRouter();
  const isPublished = Boolean(published);
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

  const [value, setValue] = useState(published?.finalText ?? "");
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
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);
  const [storedDelayedCount, setStoredDelayedCount] = useState(0);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  /** True after draft text has loaded (or published text is ready); drives autofocus. */
  const [textLoaded, setTextLoaded] = useState(isPublished);
  const ambient = useAmbientSceneContext();

  useEffect(() => {
    noBackspaceRef.current = noBackspace;
  }, [noBackspace]);

  useEffect(() => {
    syncRef.current?.setSessionCondition(ambient.condition);
  }, [ambient.condition]);

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
    if (isPublished) {
      readyRef.current = false;
      setTextLoaded(true);
      return;
    }

    let cancelled = false;
    readyRef.current = false;
    setTextLoaded(false);
    setBootError(null);
    setSuperseded(false);

    const sync = new EventSync(pieceId);
    syncRef.current = sync;
    sync.setSessionCondition(ambient.condition);
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
        setStoredDelayedCount(state.flags?.delayedCount ?? 0);
        exposeEvents();
        syncDebugSnapshot();
        // Text is in React state; autofocus waits for this flag + paint.
        setTextLoaded(true);

        // Flush any batches left in IndexedDB from a prior visit.
        await sync.flush();
        if (cancelled) return;

        // Resolve condition for this session start: pinned scene, else weather/defaults.
        let startCondition = ambient.condition;
        try {
          const raw = window.localStorage.getItem(SCENE_PRESET_KEY);
          const preset = raw
            ? (JSON.parse(raw) as {
                mode?: string;
                condition?: string;
              })
            : null;
          if (
            preset?.mode === "pin" &&
            (preset.condition === "clear" ||
              preset.condition === "cloudy" ||
              preset.condition === "rain" ||
              preset.condition === "snow")
          ) {
            startCondition = preset.condition;
          } else {
            const weatherRes = await fetch("/api/weather");
            if (weatherRes.ok) {
              const body = (await weatherRes.json()) as { condition?: string };
              if (
                body.condition === "clear" ||
                body.condition === "cloudy" ||
                body.condition === "rain" ||
                body.condition === "snow"
              ) {
                startCondition = body.condition;
              }
            }
          }
        } catch {
          /* keep ambient default */
        }
        if (cancelled) return;
        sync.setSessionCondition(startCondition);
        await sync.startSession(startCondition);
        if (cancelled) return;
        const started = Date.now();
        sessionStartRef.current = started;
        setSessionStartedAt(started);
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
    // Intentionally omit ambient.condition: session starts once per boot; later
    // rotations read the latest condition via setSessionCondition.
  }, [pieceId, bootAttempt, exposeEvents, isPublished, syncDebugSnapshot]);

  /** After text loads: focus editable pieces and put the caret at the end (once). */
  const placedCaretRef = useRef(false);
  useEffect(() => {
    placedCaretRef.current = false;
  }, [pieceId, bootAttempt]);

  useEffect(() => {
    if (!textLoaded || isPublished || superseded || bootError) return;
    if (placedCaretRef.current) return;
    const el = textareaRef.current;
    if (!el || el.readOnly) return;

    const placeCaret = () => {
      if (placedCaretRef.current) return;
      placedCaretRef.current = true;
      el.focus({ preventScroll: true });
      const len = el.value.length;
      el.setSelectionRange(len, len);
      el.scrollTop = el.scrollHeight;
      el.scrollIntoView({ block: "nearest", inline: "nearest" });
    };

    // Wait a frame so the controlled value has painted.
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(placeCaret);
    });
    return () => window.cancelAnimationFrame(id);
  }, [textLoaded, isPublished, superseded, bootError, pieceId, bootAttempt]);

  const onPublish = useCallback(
    async (args: { title: string; replayPublic: boolean }) => {
      setPublishBusy(true);
      setPublishError(null);
      try {
        await syncRef.current?.flush();
        const res = await fetch(`/api/pieces/${pieceId}/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: args.title,
            finalText: prevValueRef.current,
            replayPublic: args.replayPublic,
          }),
        });
        const body = (await res.json().catch(() => null)) as {
          reason?: string;
        } | null;

        if (!res.ok) {
          if (res.status === 409 && body?.reason === "text_mismatch") {
            setPublishError(
              "The stored event log does not match this text. Try again after saving.",
            );
          } else {
            setPublishError("Could not publish this piece.");
          }
          return;
        }

        setPublishOpen(false);
        router.refresh();
      } catch {
        setPublishError("Could not publish this piece.");
      } finally {
        setPublishBusy(false);
      }
    },
    [pieceId, router],
  );

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

  const holdControls =
    isPublished || publishOpen || popoverOpen || debugOpen;

  useEffect(() => {
    if (!holdControls) {
      return;
    }
    setControlsVisible(true);
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, [holdControls]);

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
        setSessionStartedAt(now);
      }

      const start = sessionStartRef.current ?? now;
      sessionStartRef.current = start;
      if (sessionStartedAt === null) {
        setSessionStartedAt(start);
      }
      const t = now - start;
      const newEvents = eventsFromDiff(diff, inputType, t, prev);
      eventsRef.current = [...eventsRef.current, ...newEvents];
      originsRef.current = applyDiffToOrigins(
        originsRef.current,
        diff,
        inputType,
        prev,
      );
      prevValueRef.current = next;
      lastLocalEventAtRef.current = now;
      syncRef.current?.pushEvents(newEvents);
      exposeEvents();
      syncDebugSnapshot();
    },
    [exposeEvents, sessionStartedAt, syncDebugSnapshot],
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
      if (IS_DEV && debugOpen) {
        syncDebugSnapshot();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [debugOpen, exposeEvents, syncDebugSnapshot]);

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

  const controlsShown = controlsVisible || holdControls;

  const onWindowSideChange = (side: WindowSide) => {
    ambient.setWindowSide(side);
    void saveWindowSide(side);
    showControls();
  };

  const focusWritingArea = () => {
    if (isPublished || superseded || bootError) return;
    const el = textareaRef.current;
    if (!el || el.readOnly) return;
    el.focus({ preventScroll: true });
  };

  useEffect(() => {
    const onPaperPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isPublished || superseded || bootError) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (
        target.closest(
          ".side-window, .editor-bar, .editor-popover, button, a, input, select, textarea, [role='dialog'], [aria-label='Event debug']",
        )
      ) {
        return;
      }
      event.preventDefault();
      focusWritingArea();
    };
    bindPaperPointerDown(onPaperPointerDown);
    return () => bindPaperPointerDown(null);
  }, [bindPaperPointerDown, isPublished, superseded, bootError]);

  const chrome =
    chromeHost &&
    createPortal(
      <>
        <PublishSheet
          open={publishOpen && !isPublished}
          initialTitle={initialTitle}
          busy={publishBusy}
          error={publishError}
          onClose={() => {
            if (!publishBusy) {
              setPublishOpen(false);
              setPublishError(null);
            }
          }}
          onPublish={(args) => {
            void onPublish(args);
          }}
        />
        <EditorControls
          visible={controlsShown}
          caption={captionFor(ambient.light, ambient.condition)}
          dateLabel={formatBarDate()}
          elapsedLabel={formatElapsed(elapsedMs)}
          saveLabel={
            syncStatus && syncStatus.queuedCount > 0 ? "saving" : "saved"
          }
          timerMinutes={timerMinutes}
          timerRemainingLabel={
            timerMinutes !== null && timerRemainingMs !== null
              ? formatCountdown(timerRemainingMs)
              : null
          }
          noBackspace={noBackspace}
          scenePreset={ambient.preset}
          currentLight={ambient.light}
          currentCondition={ambient.condition}
          windowSide={ambient.windowSide}
          stillWindow={ambient.stillWindow}
          isPublished={isPublished}
          onTimerChange={(minutes) => {
            setTimerMinutes(minutes);
            if (minutes === null) {
              timerEndsAtRef.current = null;
              setTimerRemainingMs(null);
            } else {
              timerEndsAtRef.current = Date.now() + minutes * 60 * 1000;
              setTimerRemainingMs(minutes * 60 * 1000);
            }
            showControls();
          }}
          onNoBackspaceChange={(value) => {
            noBackspaceRef.current = value;
            setNoBackspace(value);
            showControls();
          }}
          onSceneChange={(preset) => {
            ambient.setPreset(preset);
            showControls();
          }}
          onWindowSideChange={onWindowSideChange}
          onStillWindowChange={(still) => {
            ambient.setStillWindow(still);
            showControls();
          }}
          onPublish={() => {
            setPublishError(null);
            setPublishOpen(true);
            showControls();
          }}
          onOpenPublic={
            published
              ? () => {
                  window.location.href = `/p/${published.slug}`;
                }
              : undefined
          }
          onPopoverChange={setPopoverOpen}
        />
        {IS_DEV && debugOpen && !isPublished ? (
          <EditorDebugPanel
            events={debugSnapshot.events}
            origins={debugSnapshot.origins}
            value={value}
            sessionStartedAt={sessionStartedAt}
            delayedBatchCount={
              storedDelayedCount + (syncStatus?.delayedQueued ?? 0)
            }
            syncStatus={syncStatus}
            loadError={bootError}
            sceneLight={ambient.light}
            sceneCondition={ambient.condition}
            sceneSourceLabel={ambient.sourceLabel}
            windowSide={ambient.windowSide}
            debugOverride={ambient.debugOverride}
            onDebugOverride={ambient.setDebugOverride}
            onWindowSideChange={onWindowSideChange}
          />
        ) : null}
      </>,
      chromeHost,
    );

  return (
    <div data-piece-id={pieceId} onMouseMove={onMouseMove}>
      {superseded ? (
        <p className="mb-4 font-ui text-[12px] text-label">
          Open in another window. Refresh to continue here.
        </p>
      ) : null}
      {bootError ? (
        <div className="flex flex-col gap-4">
          <p className="font-ui text-[13px] text-ink">
            Could not load this piece.
          </p>
          <p className="font-ui text-[12px] text-label break-words">
            {bootError}
          </p>
          <button
            type="button"
            className="editor-bar-btn w-fit"
            onClick={() => setBootAttempt((n) => n + 1)}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {source ? (
            <div className="mb-4">
              <ResponseLine
                title={source.title}
                site={source.site}
                url={source.url}
              />
            </div>
          ) : null}
          <textarea
            ref={textareaRef}
            value={value}
            readOnly={isPublished || superseded}
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
              "writing-text font-writing text-[22px] leading-[1.7] text-ink",
              isPublished || superseded ? "cursor-default" : "",
            ].join(" ")}
            style={{
              caretColor:
                isPublished || superseded ? "transparent" : "#C9772E",
            }}
            aria-label="Writing page"
          />
        </>
      )}
      {chrome}
    </div>
  );
}
