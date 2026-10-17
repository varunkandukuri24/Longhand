"use client";

import { saveDisplayName } from "@/app/actions/display-name";
import { saveHandle } from "@/app/actions/handle";
import { saveWindowSide } from "@/app/actions/window-side";
import { saveWritingCity } from "@/app/actions/writing-city";
import { useAmbientSceneContext } from "@/components/scene/ambient-context";
import { validateHandle } from "@/lib/handles";
import { rootDomain } from "@/lib/hosts";
import type { WindowSide } from "@/lib/scene";
import { useEffect, useId, useRef, useState } from "react";

type DashboardSettingsProps = {
  displayName: string;
  handle: string;
  cityName: string | null;
  email: string;
};

function handleMessage(
  reason: string | null,
  available: boolean | null,
): string {
  if (reason === "length") {
    return "Use 3 to 30 characters.";
  }
  if (reason === "format") {
    return "Lowercase letters, numbers and hyphens only.";
  }
  if (reason === "reserved") {
    return "That address is reserved.";
  }
  if (reason === "taken" || available === false) {
    return "Taken";
  }
  if (available === true) {
    return "Available";
  }
  return "";
}

export function DashboardSettings({
  displayName,
  handle: initialHandle,
  cityName,
  email,
}: DashboardSettingsProps) {
  const ambient = useAmbientSceneContext();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(displayName);
  const [nameSource, setNameSource] = useState(displayName);
  const [city, setCity] = useState(cityName ?? "");
  const [citySource, setCitySource] = useState(cityName ?? "");
  const [handle, setHandle] = useState(initialHandle);
  const [handleSource, setHandleSource] = useState(initialHandle);
  const [availability, setAvailability] = useState("");
  const [savingHandle, setSavingHandle] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const domain = (() => {
    try {
      return rootDomain();
    } catch {
      return "localhost:3000";
    }
  })();

  if (displayName !== nameSource) {
    setNameSource(displayName);
    setName(displayName);
  }
  const cityProp = cityName ?? "";
  if (cityProp !== citySource) {
    setCitySource(cityProp);
    setCity(cityProp);
  }
  if (initialHandle !== handleSource) {
    setHandleSource(initialHandle);
    setHandle(initialHandle);
  }

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

  const handleUnchanged = handle === initialHandle;
  const checked = validateHandle(handle);
  const handleKey =
    !handleUnchanged && checked.ok ? checked.handle : "";
  const formatStatus = handleUnchanged
    ? ""
    : !checked.ok
      ? handleMessage(checked.error, null)
      : "";

  useEffect(() => {
    if (!handleKey) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        const res = await fetch(
          `/api/handles/check?h=${encodeURIComponent(handleKey)}`,
        );
        const body = (await res.json().catch(() => null)) as {
          available?: boolean;
          reason?: string | null;
        } | null;
        if (cancelled || !res.ok) return;
        setAvailability(
          handleMessage(body?.reason ?? null, body?.available ?? null),
        );
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [handleKey]);

  const handleStatus = formatStatus || (handleKey ? availability : "");

  const onSide = (side: WindowSide) => {
    ambient.setWindowSide(side);
    void saveWindowSide(side);
  };

  async function commitHandle() {
    if (savingHandle || handle === initialHandle) return;
    setSavingHandle(true);
    try {
      const result = await saveHandle(handle);
      if (result.ok && result.handle) {
        setHandle(result.handle);
        setHandleSource(result.handle);
        setAvailability("");
        window.location.reload();
      } else if (result.error === "taken") {
        setAvailability("Taken");
      } else if (result.error === "invalid") {
        setAvailability(handleMessage("format", null));
      }
    } finally {
      setSavingHandle(false);
    }
  }

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
          className="editor-popover absolute left-0 top-full z-20 mt-2 w-[min(380px,calc(100vw-2rem))]"
        >
          <label className="block font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
            Your page
          </label>
          <div className="mt-2 flex items-baseline gap-0 border-b border-[#CFC9BE] font-ui text-[14px]">
            <input
              type="text"
              value={handle}
              spellCheck={false}
              autoComplete="off"
              onChange={(e) => setHandle(e.target.value.toLowerCase())}
              onBlur={() => {
                void commitHandle();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void commitHandle();
                }
              }}
              className="min-w-0 flex-1 bg-transparent py-1 text-ink outline-none"
              aria-label="Page address"
            />
            <span className="shrink-0 text-label">.{domain}</span>
          </div>
          <p className="mt-2 font-ui text-[12px] text-label">
            Lowercase letters, numbers and hyphens. Changing it later moves your
            page; old links redirect for 90 days.
          </p>
          {handleStatus ? (
            <p className="mt-1 font-ui text-[12px] text-label">{handleStatus}</p>
          ) : null}

          <div className="mt-4 border-t border-[#EEEAE3] pt-4">
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
        </div>
      ) : null}
    </div>
  );
}
