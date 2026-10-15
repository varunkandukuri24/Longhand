"use client";

import { saveDisplayName } from "@/app/actions/display-name";
import { saveWindowSide } from "@/app/actions/window-side";
import { saveWritingCity } from "@/app/actions/writing-city";
import { useAmbientSceneContext } from "@/components/scene/ambient-context";
import type { WindowSide } from "@/lib/scene";
import { useEffect, useId, useRef, useState } from "react";

type DashboardSettingsProps = {
  displayName: string;
  cityName: string | null;
  email: string;
};

export function DashboardSettings({
  displayName,
  cityName,
  email,
}: DashboardSettingsProps) {
  const ambient = useAmbientSceneContext();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [city, setCity] = useState(cityName ?? "");
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setName(displayName);
  }, [displayName]);

  useEffect(() => {
    setCity(cityName ?? "");
  }, [cityName]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onSide = (side: WindowSide) => {
    ambient.setWindowSide(side);
    void saveWindowSide(side);
  };

  return (
    <div ref={rootRef} className="relative inline">
      <button
        type="button"
        className="editor-bar-btn min-h-0 px-0"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        Settings
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Settings"
          className="editor-popover absolute left-0 top-full z-20 mt-2 w-[min(280px,calc(100vw-2rem))]"
        >
          <form
            action={async (formData) => {
              await saveDisplayName(formData);
            }}
            className="flex flex-col gap-2"
          >
            <input type="hidden" name="next" value="/dashboard" />
            <label className="font-ui text-[11.5px] text-label">
              Display name
              <input
                type="text"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
                className="mt-1 w-full border-b border-ink/20 bg-transparent py-1 font-ui text-[13px] text-ink outline-none"
              />
            </label>
            <button type="submit" className="editor-bar-btn mt-1 w-fit min-h-0">
              Save name
            </button>
          </form>

          <form
            action={async (formData) => {
              await saveWritingCity(formData);
            }}
            className="mt-3 flex flex-col gap-2"
          >
            <input type="hidden" name="next" value="/dashboard" />
            <label className="font-ui text-[11.5px] text-label">
              City
              <input
                type="text"
                name="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                maxLength={80}
                placeholder="Optional"
                className="mt-1 w-full border-b border-ink/20 bg-transparent py-1 font-ui text-[13px] text-ink outline-none placeholder:text-label/50"
              />
            </label>
            <button type="submit" className="editor-bar-btn mt-1 w-fit min-h-0">
              Save city
            </button>
          </form>

          <p className="mt-3 font-ui text-[11.5px] text-label">Window</p>
          <div className="mt-1 flex gap-3">
            <button
              type="button"
              className={[
                "editor-bar-btn min-h-0 px-0",
                ambient.windowSide === "left" ? "text-ink underline" : "",
              ].join(" ")}
              onClick={() => onSide("left")}
            >
              Left
            </button>
            <button
              type="button"
              className={[
                "editor-bar-btn min-h-0 px-0",
                ambient.windowSide === "right" ? "text-ink underline" : "",
              ].join(" ")}
              onClick={() => onSide("right")}
            >
              Right
            </button>
          </div>

          <p className="mt-3 font-ui text-[11.5px] text-label">Still window</p>
          <div className="mt-1 flex gap-3">
            <button
              type="button"
              className={[
                "editor-bar-btn min-h-0 px-0",
                ambient.stillWindow ? "text-ink underline" : "",
              ].join(" ")}
              onClick={() => ambient.setStillWindow(true)}
            >
              On
            </button>
            <button
              type="button"
              className={[
                "editor-bar-btn min-h-0 px-0",
                !ambient.stillWindow ? "text-ink underline" : "",
              ].join(" ")}
              onClick={() => ambient.setStillWindow(false)}
            >
              Off
            </button>
          </div>

          <p className="mt-3 font-ui text-[11.5px] text-label">Email</p>
          <p className="mt-1 break-all font-ui text-[12px] text-ink">{email}</p>
        </div>
      ) : null}
    </div>
  );
}
