"use client";

import { saveWritingType } from "@/app/actions/writing-type";
import {
  OwnerChrome,
  type OwnerAccount,
} from "@/components/account/OwnerChrome";
import { EditorControls } from "@/components/editor/EditorControls";
import { EditorDebugPanel } from "@/components/editor/EditorDebugPanel";
import { GuestChrome } from "@/components/editor/GuestChrome";
import { GuestNudge } from "@/components/editor/GuestNudge";
import {
  GuestSignInDialog,
  type GuestSignInReason,
} from "@/components/editor/GuestSignInDialog";
import {
  PublishSheet,
  type PublishResultState,
} from "@/components/editor/PublishSheet";
import type { PieceVisibility } from "@/lib/pieces/publish";
import {
  EDITOR_TOP_OFFSET_PX,
  PaperPage,
} from "@/components/scene/PaperPage";
import { useAmbientSceneContext } from "@/components/scene/ambient-context";
import { WritingMirror } from "@/components/editor/WritingMirror";
import { ReferencesRow } from "@/components/references/ReferencesRow";
import { blankPlaceholder } from "@/lib/editor/greeting";
import {
  dismissNudge,
  isNudgeDismissed,
  takeGuestCaret,
} from "@/lib/guest/caret";
import {
  atGuestLimit,
  exceedsGuestLimit,
  GUEST_BATCH_MIN_INTERVAL_MS,
  GUEST_NUDGE_WORDS,
} from "@/lib/guest/limits";
import { wordCount } from "@/lib/receipt/compute-receipt";
import {
  captureEdit,
  type PendingLink,
} from "@/lib/editor/capture-events";
import {
  measureCaretProbe,
  TYPEWRITER_MIN_ABOVE_BOTTOM_PX,
  typewriterScrollTop,
} from "@/lib/editor/caret-line";
import { diffText } from "@/lib/editor/diff";
import {
  linkEndingAt,
  replaceSelectionWithLabel,
} from "@/lib/editor/link-edit";
import {
  shouldBlockBeforeInput,
  shouldBlockKeydown,
} from "@/lib/editor/no-backspace";
import { labelForUrl, referencesFor } from "@/lib/references";
import {
  urlBeforeWhitespace,
  urlsFollowedByWhitespaceInRange,
} from "@/lib/receipt/shorten";
import type { CharOrigin, EditEvent, TextLink } from "@/lib/receipt/types";
import { captionFor } from "@/lib/scene";
import { SCENE_PRESET_KEY } from "@/lib/scene/use-ambient-scene";
import { EventSync, IDLE_NEW_SESSION_MS } from "@/lib/sync/event-sync";
import {
  phoneWritingSize,
  writingFontCssVar,
  type WritingFont,
  type WritingSize,
} from "@/lib/editor/type-prefs";
import {
  formatWritingClock,
  liveSittingActiveMs,
} from "@/lib/receipt/writing-time";
import { saveLabelFor } from "@/lib/sync/save-label";
import type { SyncStatus } from "@/lib/sync/types";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type CompositionEvent,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type PointerEventHandler,
  type RefObject,
} from "react";
import { createPortal, flushSync } from "react-dom";

type TimerMinutes = 10 | 15 | 25;
const IS_DEV = process.env.NODE_ENV === "development";

type FocusEditorProps = {
  mode: "guest" | "writer";
  pieceId: string | null;
  initialTitle?: string;
  writerHandle?: string;
  domain: string;
  account?: OwnerAccount;
  initialFont?: WritingFont;
  initialFontSize?: WritingSize;
  examplePieceUrl?: string | null;
  googleEnabled?: boolean;
  emailProviderId?: string;
  openPublishOnLoad?: boolean;
};

function formatBarDate(d = new Date()): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(d);
}

function formatCountdown(ms: number): string {
  return formatWritingClock(Math.max(0, ms));
}

export function FocusEditor(props: FocusEditorProps) {
  const paperPointerDownRef = useRef<PointerEventHandler<HTMLDivElement> | null>(
    null,
  );
  const columnRef = useRef<HTMLDivElement | null>(null);
  const [chromeHost, setChromeHost] = useState<HTMLDivElement | null>(null);

  return (
    <PaperPage
      topOffsetPx={EDITOR_TOP_OFFSET_PX}
      slide
      editorScroll
      columnRef={columnRef}
      onColumnScroll={(event) => {
        const scrolled = event.currentTarget.scrollTop > 0;
        event.currentTarget.dataset.scrolled = scrolled ? "true" : "false";
      }}
      onPointerDown={(event) => {
        paperPointerDownRef.current?.(event);
      }}
      chrome={<div ref={setChromeHost} />}
    >
      <FocusEditorBody
        {...props}
        chromeHost={chromeHost}
        columnRef={columnRef}
        bindPaperPointerDown={(handler) => {
          paperPointerDownRef.current = handler;
        }}
      />
    </PaperPage>
  );
}

function FocusEditorBody({
  mode,
  pieceId: initialPieceId,
  initialTitle = "",
  writerHandle = "",
  domain,
  account,
  initialFont = "literata",
  initialFontSize = 20,
  examplePieceUrl = null,
  googleEnabled = false,
  emailProviderId = "nodemailer",
  openPublishOnLoad = false,
  bindPaperPointerDown,
  chromeHost,
  columnRef,
}: FocusEditorProps & {
  bindPaperPointerDown: (
    handler: PointerEventHandler<HTMLDivElement> | null,
  ) => void;
  chromeHost: HTMLDivElement | null;
  columnRef: RefObject<HTMLDivElement | null>;
}) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement | null>(null);
  const prevValueRef = useRef("");
  const originsRef = useRef<CharOrigin[]>([]);
  const linksRef = useRef<TextLink[]>([]);
  const eventsRef = useRef<EditEvent[]>([]);
  const pendingLinkRef = useRef<PendingLink | null>(null);
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
  const [title] = useState(initialTitle);
  const [links, setLinks] = useState<TextLink[]>([]);
  const [caretIndex, setCaretIndex] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const pieceIdRef = useRef(initialPieceId);
  const [livePieceId, setLivePieceId] = useState(initialPieceId);
  const pendingCreateEventsRef = useRef<EditEvent[]>([]);
  const creatingPieceRef = useRef<Promise<string | null> | null>(null);
  const syncReadyRef = useRef(Boolean(initialPieceId));
  const guestLimitRef = useRef(false);
  const [priorActiveMs, setPriorActiveMs] = useState(0);
  const sittingEventsRef = useRef<EditEvent[]>([]);
  const [sittingActiveMs, setSittingActiveMs] = useState(0);
  const [totalActiveMs, setTotalActiveMs] = useState(0);
  const [writingFont, setWritingFont] = useState<WritingFont>(initialFont);
  const [writingSize, setWritingSize] = useState<WritingSize>(initialFontSize);
  const [noBackspace, setNoBackspace] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState<TimerMinutes | null>(null);
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
  const [publishOpen, setPublishOpen] = useState(
    Boolean(openPublishOnLoad && mode !== "guest"),
  );
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<PublishResultState | null>(
    null,
  );
  const publishButtonRef = useRef<HTMLButtonElement | null>(null);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [signInReason, setSignInReason] = useState<GuestSignInReason>("empty");
  const [guestCreateLimited, setGuestCreateLimited] = useState(false);
  const guestCreateLimitedRef = useRef(false);
  const [guestAtLimit, setGuestAtLimit] = useState(false);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [nudgeHidden, setNudgeHidden] = useState(false);
  /** True after draft text has loaded; drives autofocus. */
  const [textLoaded, setTextLoaded] = useState(false);
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

  const loadKey = `${initialPieceId ?? "new"}:${bootAttempt}`;
  const [activeLoadKey, setActiveLoadKey] = useState(loadKey);
  if (loadKey !== activeLoadKey) {
    setActiveLoadKey(loadKey);
    setTextLoaded(false);
    setBootError(null);
    setSuperseded(false);
  }

  const isGuest = mode === "guest";

  const bindSync = useCallback(
    (id: string) => {
      const sync = new EventSync(id, {
        minFlushIntervalMs: isGuest ? GUEST_BATCH_MIN_INTERVAL_MS : 0,
      });
      syncRef.current?.stop();
      syncRef.current = sync;
      const unsubscribe = sync.subscribe(setSyncStatus);
      const unsubSuperseded = sync.onSuperseded(() => {
        setSuperseded(true);
        readyRef.current = false;
      });
      const unsubLimit = sync.onGuestLimit(() => {
        guestLimitRef.current = true;
        setGuestAtLimit(true);
        setSignInReason("limit");
        setSignInOpen(true);
      });
      sync.start();
      return () => {
        unsubscribe();
        unsubSuperseded();
        unsubLimit();
        sync.stop();
        if (syncRef.current === sync) {
          syncRef.current = null;
        }
      };
    },
    [isGuest],
  );

  const resolveStartCondition = useCallback(async () => {
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
    return startCondition;
  }, [ambient.condition]);

  const ensureGuestPiece = useCallback(async (): Promise<string | null> => {
    if (guestCreateLimitedRef.current) return null;
    if (pieceIdRef.current) return pieceIdRef.current;
    if (creatingPieceRef.current) return creatingPieceRef.current;

    creatingPieceRef.current = (async () => {
      const res = await fetch("/api/guest/pieces", { method: "POST" });
      if (res.status === 429) {
        pendingCreateEventsRef.current = [];
        guestCreateLimitedRef.current = true;
        setGuestCreateLimited(true);
        setSignInReason("create_limit");
        setSignInOpen(true);
        return null;
      }
      if (!res.ok) {
        pendingCreateEventsRef.current = [];
        guestCreateLimitedRef.current = true;
        setGuestCreateLimited(true);
        setSignInReason("create_limit");
        setSignInOpen(true);
        return null;
      }
      const body = (await res.json()) as { pieceId?: string };
      if (!body.pieceId) return null;

      pieceIdRef.current = body.pieceId;
      setLivePieceId(body.pieceId);
      setGuestCreateLimited(false);
      bindSync(body.pieceId);
      const sync = syncRef.current;
      if (!sync) return body.pieceId;
      sync.setSessionCondition(ambient.condition);
      await sync.startSession(ambient.condition);
      // After the last await: JS is single-threaded, so no input can land
      // between taking the buffer and marking sync ready.
      const buffered = pendingCreateEventsRef.current;
      pendingCreateEventsRef.current = [];
      sync.queueEventsNow(buffered);
      syncReadyRef.current = true;
      await sync.flush();
      return body.pieceId;
    })().finally(() => {
      creatingPieceRef.current = null;
    });

    return creatingPieceRef.current;
  }, [bindSync, ambient.condition]);

  useEffect(() => {
    let cancelled = false;
    readyRef.current = false;
    const id = pieceIdRef.current;

    if (!id) {
      readyRef.current = true;
      setTextLoaded(true);
      const started = Date.now();
      sessionStartRef.current = started;
      setSessionStartedAt(started);
      lastLocalEventAtRef.current = null;
      setBootError(null);
      return;
    }

    const unbind = bindSync(id);

    void (async () => {
      try {
        const sync = syncRef.current;
        if (!sync) return;
        const state = await sync.loadState();
        if (cancelled) return;

        prevValueRef.current = state.text;
        originsRef.current = state.origins.slice();
        linksRef.current = (state.links ?? []).slice();
        eventsRef.current = state.events.slice();
        setValue(state.text);
        setLinks((state.links ?? []).slice());
        setPriorActiveMs(state.priorActiveMs ?? 0);
        setTotalActiveMs(state.priorActiveMs ?? 0);
        setSittingActiveMs(0);
        sittingEventsRef.current = [];
        setStoredDelayedCount(state.flags?.delayedCount ?? 0);
        if (isGuest && atGuestLimit(state.text)) {
          guestLimitRef.current = true;
          setGuestAtLimit(true);
        }
        if (isGuest && id) {
          setNudgeHidden(isNudgeDismissed(id));
        }
        exposeEvents();
        syncDebugSnapshot();
        setTextLoaded(true);

        await sync.flush();
        if (cancelled) return;

        const startCondition = await resolveStartCondition();
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
      unbind();
    };
  }, [initialPieceId, bootAttempt, exposeEvents, syncDebugSnapshot, bindSync, isGuest, resolveStartCondition]);

  /** Grow the textarea to its content so REFERENCES sits under the last line. */
  const syncTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const lineMin = writingSize * 1.7 * 3;
    el.style.height = `${Math.max(el.scrollHeight, lineMin)}px`;
  }, [writingSize]);

  const ensureCaretVisible = useCallback(() => {
    const scrollEl = columnRef.current;
    const textarea = textareaRef.current;
    const mirrorRoot = mirrorRef.current;
    if (!scrollEl || !textarea || !mirrorRoot) return;

    const probe = mirrorRoot.querySelector(
      "[data-caret-probe]",
    ) as HTMLElement | null;
    if (!probe) return;

    const caret = measureCaretProbe(scrollEl, probe);
    const next = typewriterScrollTop(
      scrollEl,
      caret,
      TYPEWRITER_MIN_ABOVE_BOTTOM_PX,
    );
    if (next === null) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    scrollEl.scrollTo({
      top: next,
      behavior: reduced ? "auto" : "smooth",
    });
  }, [columnRef]);

  const syncCaretIndex = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    setCaretIndex(el.selectionStart);
  }, []);

  useLayoutEffect(() => {
    syncTextareaHeight();
  }, [value, syncTextareaHeight, textLoaded, writingFont, writingSize]);

  useLayoutEffect(() => {
    ensureCaretVisible();
  }, [value, caretIndex, textLoaded, writingFont, writingSize, ensureCaretVisible]);

  /** After text loads: put the caret at the end (empty pages: start). */
  const placedCaretRef = useRef(false);
  useEffect(() => {
    placedCaretRef.current = false;
  }, [initialPieceId, bootAttempt]);

  const dialogOpen = signInOpen || publishOpen;

  useEffect(() => {
    if (!textLoaded || superseded || bootError || guestCreateLimited) return;
    if (dialogOpen) return;

    const placeCaret = () => {
      const el = textareaRef.current;
      if (!el || el.readOnly) return;
      el.focus({ preventScroll: true });
      if (placedCaretRef.current) return;
      placedCaretRef.current = true;
      syncTextareaHeight();
      const restored = takeGuestCaret();
      const pos =
        restored !== null
          ? Math.max(0, Math.min(restored, el.value.length))
          : el.value.length;
      el.setSelectionRange(pos, pos);
      setCaretIndex(pos);
      ensureCaretVisible();
    };

    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(placeCaret);
    });
    return () => window.cancelAnimationFrame(id);
  }, [
    textLoaded,
    superseded,
    bootError,
    guestCreateLimited,
    dialogOpen,
    initialPieceId,
    bootAttempt,
    syncTextareaHeight,
    ensureCaretVisible,
  ]);

  useEffect(() => {
    if (!isGuest || !guestCreateLimited || signInOpen) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("[role='dialog']")) return;
      event.preventDefault();
      setSignInReason("create_limit");
      setSignInOpen(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isGuest, guestCreateLimited, signInOpen]);

  const onPublish = useCallback(
    async (args: { title: string; visibility: PieceVisibility }) => {
      setPublishBusy(true);
      setPublishError(null);
      try {
        await syncRef.current?.flush();
        if (syncRef.current?.hasRefusedBatches()) {
          setPublishError(
            "Some of your writing didn't save, so this piece can't be published yet.",
          );
          return;
        }
        const id = pieceIdRef.current;
        if (!id) return;
        const res = await fetch(`/api/pieces/${id}/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            title: args.title,
            finalText: prevValueRef.current,
            visibility: args.visibility,
          }),
        });
        const body = (await res.json().catch(() => null)) as {
          reason?: string;
          url?: string;
          visibility?: PieceVisibility;
          signatureLine?: string;
        } | null;

        if (!res.ok) {
          if (res.status === 409 && body?.reason === "text_mismatch") {
            setPublishError(
              "Some of your writing didn't save, so this piece can't be published yet.",
            );
          } else {
            setPublishError("Could not publish this piece.");
          }
          return;
        }

        if (body?.url && body.visibility && body.signatureLine) {
          setPublishResult({
            url: body.url,
            visibility: body.visibility,
            signatureLine: body.signatureLine,
          });
        } else {
          setPublishError("Could not publish this piece.");
        }
      } catch {
        setPublishError("Could not publish this piece.");
      } finally {
        setPublishBusy(false);
      }
    },
    [],
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

  const holdControls = publishOpen || popoverOpen || debugOpen || signInOpen;

  useEffect(() => {
    if (!holdControls) return;
    queueMicrotask(() => setControlsVisible(true));
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

  const sessionT = useCallback(() => {
    const now = Date.now();
    const lastLocal = lastLocalEventAtRef.current;
    if (lastLocal !== null && now - lastLocal >= IDLE_NEW_SESSION_MS) {
      sessionStartRef.current = now;
      setSessionStartedAt(now);
      // Long idle starts a new writing session; prior sittings stay in priorActiveMs.
      setPriorActiveMs((prev) => prev + liveSittingActiveMs({
        events: sittingEventsRef.current,
        lastEventWallMs: lastLocal,
        nowWallMs: lastLocal,
      }));
      sittingEventsRef.current = [];
      setSittingActiveMs(0);
    }
    const start = sessionStartRef.current ?? now;
    sessionStartRef.current = start;
    if (sessionStartedAt === null) {
      setSessionStartedAt(start);
    }
    lastLocalEventAtRef.current = now;
    return now - start;
  }, [sessionStartedAt]);

  const commitDiff = useCallback(
    (next: string, inputType: string | undefined) => {
      if (!readyRef.current || syncRef.current?.isSuperseded()) {
        return;
      }

      if (isGuest && guestCreateLimitedRef.current) {
        setSignInReason("create_limit");
        setSignInOpen(true);
        return;
      }

      if (isGuest && exceedsGuestLimit(next)) {
        guestLimitRef.current = true;
        setGuestAtLimit(true);
        setSignInReason("limit");
        setSignInOpen(true);
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

      const t = sessionT();
      const captured = captureEdit({
        prev,
        next,
        priorEvents: eventsRef.current,
        pendingLink: pendingLinkRef.current,
        t,
        inputType,
        diff,
      });
      pendingLinkRef.current = captured.pendingLink;

      if (IS_DEV && captured.diverged) {
        console.error(
          "[longhand] event log diverged from textarea",
          { rebuilt: captured.text, textarea: next },
        );
      }

      const newEvents = captured.events.slice(eventsRef.current.length);
      eventsRef.current = captured.events;
      originsRef.current = captured.origins;
      linksRef.current = captured.links;
      sittingEventsRef.current = sittingEventsRef.current.concat(newEvents);
      setLinks(captured.links.slice());
      prevValueRef.current = next;
      if (isGuest && atGuestLimit(next)) {
        guestLimitRef.current = true;
        setGuestAtLimit(true);
        setSignInReason("limit");
        setSignInOpen(true);
      }
      if (syncRef.current && syncReadyRef.current) {
        syncRef.current.pushEvents(newEvents);
      } else if (isGuest && !guestCreateLimitedRef.current) {
        pendingCreateEventsRef.current.push(...newEvents);
        void ensureGuestPiece();
      }
      exposeEvents();
      syncDebugSnapshot();

      // After paste, shorten URLs already followed by whitespace (last → first).
      if (inputType === "insertFromPaste" || inputType === "insertFromDrop") {
        const el = textareaRef.current;
        if (el) {
          const pasteEnd = diff.pos + diff.inserted.length;
          const targets = urlsFollowedByWhitespaceInRange(
            next,
            diff.pos,
            pasteEnd,
          ).sort((a, b) => b.start - a.start);
          for (const target of targets) {
            if (
              linksRef.current.some(
                (l) => l.start === target.start && l.url === target.url,
              )
            ) {
              continue;
            }
            const label = labelForUrl(target.url);
            pendingLinkRef.current = {
              url: target.url,
              label,
              start: target.start,
              end: target.end,
            };
            replaceSelectionWithLabel(el, target.start, target.end, target.url);
            // input handler runs sync via execCommand and clears pendingLink
          }
        }
      }
    },
    [exposeEvents, sessionT, syncDebugSnapshot, isGuest, ensureGuestPiece],
  );

  useEffect(() => {
    exposeEvents();
    const id = window.setInterval(() => {
      const sitting = liveSittingActiveMs({
        events: sittingEventsRef.current,
        lastEventWallMs: lastLocalEventAtRef.current,
        nowWallMs: Date.now(),
      });
      setSittingActiveMs(sitting);
      setTotalActiveMs(priorActiveMs + sitting);
      if (timerEndsAtRef.current !== null) {
        setTimerRemainingMs(timerEndsAtRef.current - Date.now());
      }
      if (IS_DEV && debugOpen) {
        syncDebugSnapshot();
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [debugOpen, exposeEvents, priorActiveMs, syncDebugSnapshot]);

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
        return;
      }

      if (
        isGuest &&
        guestCreateLimitedRef.current
      ) {
        event.preventDefault();
        setSignInReason("create_limit");
        setSignInOpen(true);
        return;
      }

      if (
        isGuest &&
        guestLimitRef.current &&
        inputEvent.inputType.startsWith("insert")
      ) {
        event.preventDefault();
        setSignInReason("limit");
        setSignInOpen(true);
      }
    };

    el.addEventListener("beforeinput", onBeforeInput);
    return () => {
      el.removeEventListener("beforeinput", onBeforeInput);
    };
  }, [isGuest, textLoaded]);

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
    setCaretIndex(event.currentTarget.selectionStart);
    commitDiff(next, lastInputTypeRef.current);
    syncTextareaHeight();
    scheduleControlsFade();
  };

  const onInput = (event: FormEvent<HTMLTextAreaElement>) => {
    if (isGuest && guestCreateLimitedRef.current) {
      const prev = prevValueRef.current;
      event.currentTarget.value = prev;
      setValue(prev);
      setSignInReason("create_limit");
      setSignInOpen(true);
      return;
    }
    const next = event.currentTarget.value;
    if (isGuest && exceedsGuestLimit(next)) {
      const prev = prevValueRef.current;
      event.currentTarget.value = prev;
      setValue(prev);
      setCaretIndex(event.currentTarget.selectionStart);
      guestLimitRef.current = true;
      setGuestAtLimit(true);
      setSignInReason("limit");
      setSignInOpen(true);
      return;
    }
    const caret = event.currentTarget.selectionStart;
    // When shortening via execCommand in keydown, flush so React cannot
    // overwrite the DOM before Space/Enter's default insert runs.
    if (pendingLinkRef.current) {
      flushSync(() => {
        setValue(next);
        setCaretIndex(caret);
      });
    } else {
      setValue(next);
      setCaretIndex(caret);
    }

    if (composingRef.current) {
      return;
    }

    const native = event.nativeEvent as InputEvent;
    const inputType = native.inputType || lastInputTypeRef.current;
    commitDiff(next, inputType);
    syncTextareaHeight();
    scheduleControlsFade();
  };

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(event.target.value);
    setCaretIndex(event.target.selectionStart);
  };

  const onSelect = () => {
    syncCaretIndex();
  };

  const onKeyUp = () => {
    syncCaretIndex();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isGuest && guestCreateLimitedRef.current) {
      event.preventDefault();
      setSignInReason("create_limit");
      setSignInOpen(true);
      return;
    }

    enterFullscreenOnce();

    const el = event.currentTarget;
    const selStart = el.selectionStart;
    const selEnd = el.selectionEnd;

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

    // Shorten a URL just before Space or Enter via execCommand (normal input path).
    if (
      (event.key === " " || event.key === "Enter") &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      selStart === selEnd
    ) {
      const target = urlBeforeWhitespace(el.value, selStart);
      if (target) {
        const label = labelForUrl(target.url);
        pendingLinkRef.current = {
          url: target.url,
          label,
          start: target.start,
          end: target.end,
        };
        const { caretAfter } = replaceSelectionWithLabel(
          el,
          target.start,
          target.end,
          target.url,
        );
        // flushSync in onInput already applied the label; put the caret after
        // it and let Space/Enter insert normally (no preventDefault).
        el.setSelectionRange(caretAfter, caretAfter);
      }
    }

    // Backspace at the end of a label selects the whole label; let delete proceed.
    if (
      event.key === "Backspace" &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      selStart === selEnd
    ) {
      const link = linkEndingAt(selStart, linksRef.current);
      if (link) {
        el.setSelectionRange(link.start, link.end);
        // no preventDefault — Backspace deletes the selection as one normal delete
      }
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

  const onWritingTypeChange = (next: {
    font: WritingFont;
    fontSize: WritingSize;
  }) => {
    setWritingFont(next.font);
    setWritingSize(next.fontSize);
    void saveWritingType(next);
    showControls();
  };

  const writingTypeStyle = {
    ["--writing-font" as string]: writingFontCssVar(writingFont),
    ["--writing-size" as string]: `${writingSize}px`,
    ["--writing-size-phone" as string]: `${phoneWritingSize(writingSize)}px`,
  };

  const focusWritingArea = useCallback(() => {
    if (superseded || bootError || guestCreateLimited) return;
    const el = textareaRef.current;
    if (!el || el.readOnly) return;
    el.focus({ preventScroll: true });
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, [superseded, bootError, guestCreateLimited]);

  useEffect(() => {
    if (!openPublishOnLoad || isGuest || !initialPieceId) return;
    window.history.replaceState({}, "", `/write/${initialPieceId}`);
  }, [openPublishOnLoad, isGuest, initialPieceId]);

  const openGuestSignIn = useCallback((reason: GuestSignInReason) => {
    setSignInReason(reason);
    setSignInOpen(true);
    showControls();
  }, [showControls]);

  useEffect(() => {
    const onPaperPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
      if (superseded || bootError) return;
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
  }, [bindPaperPointerDown, superseded, bootError, focusWritingArea]);

  const words = wordCount(value);
  const showNudge =
    isGuest &&
    Boolean(livePieceId) &&
    words >= GUEST_NUDGE_WORDS &&
    !nudgeHidden &&
    !guestAtLimit;

  const chrome =
    chromeHost &&
    createPortal(
      <>
        {isGuest ? (
          <GuestChrome
            visible={controlsShown}
            examplePieceUrl={examplePieceUrl}
            onSignIn={() =>
              openGuestSignIn(value.length > 0 ? "keep" : "empty")
            }
          />
        ) : account ? (
          <OwnerChrome
            visible={controlsShown}
            currentPieceId={livePieceId}
            account={account}
          />
        ) : null}
        {isGuest ? (
          <GuestSignInDialog
            open={signInOpen}
            reason={signInReason}
            googleEnabled={googleEnabled}
            emailProviderId={emailProviderId}
            caretIndex={caretIndex}
            onClose={() => setSignInOpen(false)}
          />
        ) : (
          <PublishSheet
            open={publishOpen}
            initialTitle={title}
            handle={writerHandle}
            domain={domain}
            busy={publishBusy}
            error={publishError}
            published={publishResult}
            publishButtonRef={publishButtonRef}
            onClose={() => {
              if (!publishBusy) {
                setPublishOpen(false);
                setPublishError(null);
                setPublishResult(null);
              }
            }}
            onPublish={(args) => {
              void onPublish(args);
            }}
            onBackToPages={() => {
              router.push("/");
            }}
            onOpenPage={(url) => {
              window.location.href = url;
            }}
          />
        )}
        {showNudge && livePieceId ? (
          <GuestNudge
            visible={controlsShown}
            onSignIn={() => openGuestSignIn("keep")}
            onDismiss={() => {
              setNudgeHidden(true);
              dismissNudge(livePieceId);
            }}
          />
        ) : null}
        <EditorControls
          visible={controlsShown}
          caption={captionFor(ambient.light, ambient.condition)}
          dateLabel={formatBarDate()}
          writingTimeLabel={formatWritingClock(totalActiveMs)}
          sittingTimeLabel={formatWritingClock(sittingActiveMs)}
          allSittingsLabel={formatWritingClock(totalActiveMs)}
          saveLabel={saveLabelFor(syncStatus)}
          timerMinutes={timerMinutes}
          timerRemainingLabel={
            timerMinutes !== null &&
            timerRemainingMs !== null &&
            timerRemainingMs > 0
              ? formatCountdown(timerRemainingMs)
              : null
          }
          noBackspace={noBackspace}
          scenePreset={ambient.preset}
          currentLight={ambient.light}
          currentCondition={ambient.condition}
          stillWindow={ambient.stillWindow}
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
          onStillWindowChange={(still) => {
            ambient.setStillWindow(still);
            showControls();
          }}
          writingFont={writingFont}
          writingSize={writingSize}
          onWritingTypeChange={onWritingTypeChange}
          onPublish={() => {
            if (isGuest) {
              openGuestSignIn("publish");
              return;
            }
            setPublishError(null);
            setPublishResult(null);
            setPublishOpen(true);
            showControls();
          }}
          publishDisabled={isGuest && value.trim().length === 0}
          publishButtonRef={publishButtonRef}
          onPopoverChange={setPopoverOpen}
        />
        {IS_DEV && debugOpen ? (
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
            debugOverride={ambient.debugOverride}
            onDebugOverride={ambient.setDebugOverride}
            fastTransitions={ambient.fastTransitions}
            onFastTransitionsChange={ambient.setFastTransitions}
          />
        ) : null}
      </>,
      chromeHost,
    );

  return (
    <div
      className="writing-scroll-inner"
      data-piece-id={livePieceId ?? ""}
      data-writing-font={writingFont}
      data-writing-size={writingSize}
      style={writingTypeStyle}
      onMouseMove={onMouseMove}
    >
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
          <div className="writing-frame" data-writing-frame>
            <div ref={mirrorRef}>
              <WritingMirror
                text={value}
                links={links}
                caretIndex={caretIndex}
                className="font-writing leading-[1.7]"
              />
            </div>
            {value.length === 0 && (mode === "guest" || hydrated) ? (
              <div className="writing-placeholder" aria-hidden="true">
                {blankPlaceholder(mode, account?.displayName ?? "")}
              </div>
            ) : null}
            <textarea
              ref={textareaRef}
              value={value}
              rows={1}
              readOnly={superseded || guestCreateLimited}
              onCompositionStart={onCompositionStart}
              onCompositionEnd={onCompositionEnd}
              onInput={onInput}
              onChange={onChange}
              onKeyDown={onKeyDown}
              onKeyUp={onKeyUp}
              onSelect={onSelect}
              onClick={syncCaretIndex}
              onMouseDown={onMouseDown}
              spellCheck
              autoCapitalize="off"
              autoCorrect="off"
              className={[
                "writing-text font-writing leading-[1.7] text-ink",
                superseded || guestCreateLimited ? "cursor-default" : "",
              ].join(" ")}
              style={{
                caretColor:
                  superseded || guestCreateLimited ? "transparent" : "#C9772E",
              }}
              aria-label="Writing page"
            />
          </div>
          <ReferencesRow references={referencesFor(value, links)} plain />
        </>
      )}
      {chrome}
    </div>
  );
}
