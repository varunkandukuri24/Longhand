"use client";

import { BackIcon } from "@/components/icons/LonghandIcons";
import {
  PAGES_ARIA_LABEL,
  PAGES_HREF,
} from "@/lib/dashboard/layout";
import {
  CONDITIONS,
  LIGHTS,
  captionFor,
  type Condition,
  type Light,
  type WindowSide,
} from "@/lib/scene";
import type { ScenePreset } from "@/lib/scene/use-ambient-scene";
import Link from "next/link";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

const TIMER_OPTIONS = [10, 15, 25] as const;

const LIGHT_LABEL: Record<Light, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  goldenHour: "Golden hour",
  night: "Night",
};

const CONDITION_LABEL: Record<Condition, string> = {
  clear: "Clear",
  cloudy: "Cloudy",
  rain: "Rain",
  snow: "Snow",
};

type EditorControlsProps = {
  visible: boolean;
  caption: string;
  dateLabel: string;
  elapsedLabel: string;
  saveLabel: string;
  timerMinutes: (typeof TIMER_OPTIONS)[number] | null;
  timerRemainingLabel: string | null;
  noBackspace: boolean;
  scenePreset: ScenePreset;
  currentLight: Light;
  currentCondition: Condition;
  windowSide: WindowSide;
  stillWindow: boolean;
  isPublished: boolean;
  onTimerChange: (minutes: (typeof TIMER_OPTIONS)[number] | null) => void;
  onNoBackspaceChange: (value: boolean) => void;
  onSceneChange: (preset: ScenePreset) => void;
  onWindowSideChange: (side: WindowSide) => void;
  onStillWindowChange: (still: boolean) => void;
  onPublish: () => void;
  onOpenPublic?: () => void;
  onPopoverChange?: (open: boolean) => void;
};

type PopoverId = "timer" | "backspace" | "scene" | null;

export function EditorControls({
  visible,
  caption,
  dateLabel,
  elapsedLabel,
  saveLabel,
  timerMinutes,
  timerRemainingLabel,
  noBackspace,
  scenePreset,
  currentLight,
  currentCondition,
  windowSide,
  stillWindow,
  isPublished,
  onTimerChange,
  onNoBackspaceChange,
  onSceneChange,
  onWindowSideChange,
  onStillWindowChange,
  onPublish,
  onOpenPublic,
  onPopoverChange,
}: EditorControlsProps) {
  const [open, setOpen] = useState<PopoverId>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onPopoverChange?.(open !== null);
  }, [open, onPopoverChange]);

  useEffect(() => {
    if (open === null) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rowRef.current && !rowRef.current.contains(event.target as Node)) {
        setOpen(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const toggle = (id: PopoverId) => {
    setOpen((prev) => (prev === id ? null : id));
  };

  const light =
    scenePreset.mode === "pin" ? scenePreset.light : currentLight;
  const condition =
    scenePreset.mode === "pin" ? scenePreset.condition : currentCondition;

  const sceneLabel =
    scenePreset.mode === "auto"
      ? "Scene"
      : `Scene: ${captionFor(scenePreset.light, scenePreset.condition)}`;

  const timerLabel =
    timerMinutes === null
      ? "Timer"
      : timerRemainingLabel
        ? `Timer: ${timerRemainingLabel}`
        : `Timer: ${timerMinutes}m`;

  return (
    <div
      ref={rowRef}
      className="editor-bar"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
      aria-hidden={!visible}
    >
      <div className="flex min-w-0 items-center gap-4 font-ui text-[13px] text-label">
        <Link
          href={PAGES_HREF}
          aria-label={PAGES_ARIA_LABEL}
          className="editor-bar-btn pages-back min-h-0 shrink-0"
        >
          <BackIcon />
          Pages
        </Link>
        <p className="min-w-0 truncate">
          {isPublished ? (
            "Read only"
          ) : (
            <>
              {caption}
              <span className="mx-2">·</span>
              {dateLabel}
              <span className="mx-2">·</span>
              {elapsedLabel}
              <span className="mx-2">·</span>
              {saveLabel}
            </>
          )}
        </p>
      </div>

      <div className="flex items-center gap-5">
        {isPublished ? (
          onOpenPublic ? (
            <button type="button" className="editor-bar-btn" onClick={onOpenPublic}>
              Open public page
            </button>
          ) : null
        ) : (
          <>
            <Popover
              label={timerLabel}
              open={open === "timer"}
              onToggle={() => toggle("timer")}
            >
              {TIMER_OPTIONS.map((minutes) => (
                <PopoverOption
                  key={minutes}
                  active={timerMinutes === minutes}
                  onClick={() => {
                    onTimerChange(minutes);
                    setOpen(null);
                  }}
                >
                  {minutes} min
                </PopoverOption>
              ))}
              <PopoverOption
                active={timerMinutes === null}
                onClick={() => {
                  onTimerChange(null);
                  setOpen(null);
                }}
              >
                Off
              </PopoverOption>
            </Popover>

            <Popover
              label={`No backspace: ${noBackspace ? "on" : "off"}`}
              open={open === "backspace"}
              onToggle={() => toggle("backspace")}
            >
              <PopoverOption
                active={noBackspace}
                onClick={() => {
                  onNoBackspaceChange(true);
                  setOpen(null);
                }}
              >
                On
              </PopoverOption>
              <PopoverOption
                active={!noBackspace}
                onClick={() => {
                  onNoBackspaceChange(false);
                  setOpen(null);
                }}
              >
                Off
              </PopoverOption>
            </Popover>

            <Popover
              label={sceneLabel}
              open={open === "scene"}
              onToggle={() => toggle("scene")}
            >
              <PopoverOption
                active={scenePreset.mode === "auto"}
                onClick={() => {
                  onSceneChange({ mode: "auto" });
                  setOpen(null);
                }}
              >
                Auto
              </PopoverOption>
              <p className="mt-2 text-[11.5px] text-label">Light</p>
              {LIGHTS.map((l) => (
                <PopoverOption
                  key={l}
                  active={scenePreset.mode === "pin" && scenePreset.light === l}
                  onClick={() => {
                    onSceneChange({ mode: "pin", light: l, condition });
                  }}
                >
                  {LIGHT_LABEL[l]}
                </PopoverOption>
              ))}
              <p className="mt-2 text-[11.5px] text-label">Condition</p>
              {CONDITIONS.map((c) => (
                <PopoverOption
                  key={c}
                  active={
                    scenePreset.mode === "pin" && scenePreset.condition === c
                  }
                  onClick={() => {
                    onSceneChange({ mode: "pin", light, condition: c });
                  }}
                >
                  {CONDITION_LABEL[c]}
                </PopoverOption>
              ))}
              <p className="mt-2 text-[11.5px] text-label">Window</p>
              <PopoverOption
                active={windowSide === "left"}
                onClick={() => onWindowSideChange("left")}
              >
                Left
              </PopoverOption>
              <PopoverOption
                active={windowSide === "right"}
                onClick={() => onWindowSideChange("right")}
              >
                Right
              </PopoverOption>
              <p className="mt-2 text-[11.5px] text-label">Still window</p>
              <PopoverOption
                active={stillWindow}
                onClick={() => onStillWindowChange(true)}
              >
                On
              </PopoverOption>
              <PopoverOption
                active={!stillWindow}
                onClick={() => onStillWindowChange(false)}
              >
                Off
              </PopoverOption>
            </Popover>

            <button
              type="button"
              className="editor-bar-btn"
              onClick={() => {
                setOpen(null);
                onPublish();
              }}
            >
              Publish
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function Popover({
  label,
  open,
  onToggle,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const panelId = useId();
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="editor-bar-btn"
      >
        {label}
      </button>
      {open ? (
        <div id={panelId} role="dialog" className="editor-popover">
          <div className="flex flex-col gap-1 font-ui text-[12px] text-ink">
            {children}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PopoverOption({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full bg-transparent text-left font-ui text-[12px] hover:underline hover:underline-offset-4",
        active ? "text-ink" : "text-ink/65",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
