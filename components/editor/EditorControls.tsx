"use client";

import { CheckIcon } from "@/components/icons/LonghandIcons";
import {
  WRITING_FONTS,
  WRITING_FONT_LABEL,
  WRITING_SIZES,
  WRITING_SIZE_LABEL,
  writingFontCssVar,
  type WritingFont,
  type WritingSize,
} from "@/lib/editor/type-prefs";
import {
  CONDITIONS,
  LIGHTS,
  captionFor,
  type Condition,
  type Light,
} from "@/lib/scene";
import type { ScenePreset } from "@/lib/scene/use-ambient-scene";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
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

export function PhonePublishButton({
  disabled,
  faded,
  onPublish,
  buttonRef,
}: {
  disabled: boolean;
  faded: boolean;
  onPublish: () => void;
  buttonRef?: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="phone-publish"
      data-phone-publish
      disabled={disabled}
      aria-hidden={faded}
      tabIndex={faded || disabled ? -1 : 0}
      onClick={() => {
        if (disabled || faded) return;
        onPublish();
      }}
    >
      Publish
    </button>
  );
}

type EditorControlsProps = {
  visible: boolean;
  /** Skip inline opacity so phone CSS can fade the bar. */
  inlineFade?: boolean;
  phone?: boolean;
  clockTimeLabel?: string;
  caption: string;
  dateLabel: string;
  writingTimeLabel: string;
  sittingTimeLabel: string;
  allSittingsLabel: string;
  saveLabel: string;
  timerMinutes: (typeof TIMER_OPTIONS)[number] | null;
  timerRemainingLabel: string | null;
  noBackspace: boolean;
  scenePreset: ScenePreset;
  currentLight: Light;
  currentCondition: Condition;
  stillWindow: boolean;
  onTimerChange: (minutes: (typeof TIMER_OPTIONS)[number] | null) => void;
  onNoBackspaceChange: (value: boolean) => void;
  onSceneChange: (preset: ScenePreset) => void;
  onStillWindowChange: (still: boolean) => void;
  writingFont: WritingFont;
  writingSize: WritingSize;
  onWritingTypeChange: (next: {
    font: WritingFont;
    fontSize: WritingSize;
  }) => void;
  onPublish: () => void;
  publishDisabled?: boolean;
  publishButtonRef?: RefObject<HTMLButtonElement | null>;
  onPopoverChange?: (open: boolean) => void;
};

type PopoverId = "type" | "timer" | "backspace" | "scene" | null;

export function EditorControls({
  visible,
  inlineFade = true,
  phone = false,
  clockTimeLabel = "",
  caption,
  dateLabel,
  writingTimeLabel,
  sittingTimeLabel,
  allSittingsLabel,
  saveLabel,
  timerMinutes,
  timerRemainingLabel,
  noBackspace,
  scenePreset,
  currentLight,
  currentCondition,
  stillWindow,
  onTimerChange,
  onNoBackspaceChange,
  onSceneChange,
  onStillWindowChange,
  writingFont,
  writingSize,
  onWritingTypeChange,
  onPublish,
  publishDisabled = false,
  publishButtonRef,
  onPopoverChange,
}: EditorControlsProps) {
  const [open, setOpen] = useState<PopoverId>(null);
  const [timeOpen, setTimeOpen] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);
  const timeWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onPopoverChange?.(open !== null || timeOpen);
  }, [open, timeOpen, onPopoverChange]);

  useEffect(() => {
    if (open === null && !timeOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (rowRef.current && !rowRef.current.contains(target)) {
        setOpen(null);
      }
      if (timeWrapRef.current && !timeWrapRef.current.contains(target)) {
        setTimeOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(null);
        setTimeOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, timeOpen]);

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

  const writingTimeButton = (
    <span
      ref={timeWrapRef}
      className="relative inline-flex"
      onMouseEnter={() => {
        if (!timerRemainingLabel) setTimeOpen(true);
      }}
      onMouseLeave={() => setTimeOpen(false)}
    >
      <button
        type="button"
        className="editor-bar-btn min-h-0"
        aria-expanded={timeOpen}
        aria-label={
          timerRemainingLabel
            ? `${timerRemainingLabel} left`
            : `Writing time ${writingTimeLabel}`
        }
        onFocus={() => {
          if (!timerRemainingLabel) setTimeOpen(true);
        }}
        onBlur={(event) => {
          if (
            timeWrapRef.current &&
            !timeWrapRef.current.contains(event.relatedTarget as Node)
          ) {
            setTimeOpen(false);
          }
        }}
        onClick={() => {
          if (!timerRemainingLabel) setTimeOpen((v) => !v);
        }}
      >
        {timerRemainingLabel
          ? `${timerRemainingLabel} left`
          : writingTimeLabel}
      </button>
      {timeOpen && !timerRemainingLabel ? (
        <div
          className="editor-popover writing-time-popover"
          role="dialog"
          aria-label="Writing time"
        >
          <p className="writing-time-row">This sitting {sittingTimeLabel}</p>
          <p className="writing-time-row">All sittings {allSittingsLabel}</p>
          <p className="writing-time-note">
            Writing time only. It pauses when you stop for a minute.
          </p>
        </div>
      ) : null}
    </span>
  );

  const timerPopover = (
    <Popover
      label={timerLabel}
      open={open === "timer"}
      onToggle={() => toggle("timer")}
      buttonClassName={phone ? "editor-bar-phone-timer" : undefined}
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
  );

  return (
    <>
    <div
      ref={rowRef}
      className="editor-bar"
      data-editor-bar
      data-phone-bar={phone ? "" : undefined}
      style={
        inlineFade
          ? {
              opacity: visible ? 1 : 0,
              pointerEvents: visible ? "auto" : "none",
            }
          : undefined
      }
      aria-hidden={!visible}
    >
      {phone ? (
        <>
          <div className="editor-bar-phone-meta flex min-w-0 shrink items-center font-ui text-[12px] text-label whitespace-nowrap">
            <span>{dateLabel}</span>
            <span className="mx-2">·</span>
            <span>{clockTimeLabel}</span>
            <span className="mx-2">·</span>
            {writingTimeButton}
          </div>
          <div className="flex shrink-0 items-center">{timerPopover}</div>
        </>
      ) : (
        <>
      <div className="flex shrink-0 items-center font-ui text-[13px] text-label whitespace-nowrap">
        <span>{caption}</span>
        <span className="mx-2">·</span>
        <span>{dateLabel}</span>
        <span className="mx-2">·</span>
        {writingTimeButton}
        {saveLabel ? (
          <>
            <span className="mx-2">·</span>
            <span>{saveLabel}</span>
          </>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-5">
            <Popover
              label="Type"
              open={open === "type"}
              onToggle={() => toggle("type")}
              panelClassName="type-menu"
            >
              <p className="type-menu-label">Font</p>
              <div className="type-menu-fonts">
                {WRITING_FONTS.map((font) => (
                  <button
                    key={font}
                    type="button"
                    className="type-menu-font"
                    style={{ fontFamily: writingFontCssVar(font) }}
                    aria-pressed={writingFont === font}
                    onClick={() => {
                      onWritingTypeChange({ font, fontSize: writingSize });
                    }}
                  >
                    <span className="type-menu-check-slot" aria-hidden>
                      {writingFont === font ? <CheckIcon /> : null}
                    </span>
                    <span className="type-menu-font-name">
                      {WRITING_FONT_LABEL[font]}
                    </span>
                  </button>
                ))}
              </div>
              <p className="type-menu-label">Size</p>
              <div className="type-menu-sizes">
                {WRITING_SIZES.map((size) => (
                  <button
                    key={size}
                    type="button"
                    className="type-menu-size"
                    style={{ fontSize: `${size}px` }}
                    aria-label={WRITING_SIZE_LABEL[size]}
                    aria-pressed={writingSize === size}
                    onClick={() => {
                      onWritingTypeChange({
                        font: writingFont,
                        fontSize: size,
                      });
                    }}
                  >
                    A
                  </button>
                ))}
              </div>
              <p className="type-menu-note">
                Only changes your writing screen. Published pieces are always
                set in Literata.
              </p>
            </Popover>

            {timerPopover}

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
              ref={publishButtonRef}
              type="button"
              className="editor-bar-btn"
              disabled={publishDisabled}
              onClick={() => {
                if (publishDisabled) return;
                setOpen(null);
                onPublish();
              }}
            >
              Publish
            </button>
      </div>
        </>
      )}
    </div>
    {phone ? (
      <p className="phone-typing-time" aria-hidden>
        {timerRemainingLabel
          ? `${timerRemainingLabel} left`
          : writingTimeLabel}
      </p>
    ) : null}
    </>
  );
}

function Popover({
  label,
  open,
  onToggle,
  children,
  panelClassName = "",
  buttonClassName,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  panelClassName?: string;
  buttonClassName?: string;
}) {
  const panelId = useId();
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={["editor-bar-btn", buttonClassName].filter(Boolean).join(" ")}
      >
        {label}
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          className={["editor-popover", panelClassName].filter(Boolean).join(" ")}
        >
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
