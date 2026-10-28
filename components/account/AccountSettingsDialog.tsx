"use client";

import {
  saveAccountSettings,
  type AccountSettingsInput,
} from "@/app/actions/account-settings";
import { connectGoogle } from "@/app/actions/auth-links";
import { useAmbientSceneContext } from "@/components/scene/ambient-context";
import { validateHandle } from "@/lib/handles";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

type AccountSettingsDialogProps = {
  open: boolean;
  onClose: () => void;
  domain: string;
  displayName: string;
  handle: string;
  email: string;
  cityName: string | null;
  googleLinked: boolean;
  googleEnabled: boolean;
};

function handleHint(
  reason: string | null,
  available: boolean | null,
): string {
  if (reason === "length") return "Use 3 to 30 characters.";
  if (reason === "format") return "Lowercase letters, numbers and hyphens only.";
  if (reason === "reserved") return "That address is reserved.";
  if (reason === "taken" || available === false) return "Taken";
  if (available === true) return "Available";
  return "";
}

export function AccountSettingsDialog({
  open,
  onClose,
  domain,
  displayName,
  handle: initialHandle,
  email,
  cityName,
  googleLinked,
  googleEnabled,
}: AccountSettingsDialogProps) {
  const ambient = useAmbientSceneContext();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [name, setName] = useState(displayName);
  const [handle, setHandle] = useState(initialHandle);
  const [city, setCity] = useState(cityName ?? "");
  const [availability, setAvailability] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(displayName);
      setHandle(initialHandle);
      setCity(cityName ?? "");
      setAvailability("");
      setError(null);
      setBusy(false);
    }
  }

  const setWindowLocked = ambient.setWindowLocked;
  useEffect(() => {
    setWindowLocked(open);
    return () => setWindowLocked(false);
  }, [open, setWindowLocked]);

  const handleKey = handle.trim().toLowerCase();
  const checked = validateHandle(handleKey);
  const formatAvailability = !checked.ok
    ? handleHint(checked.error, null)
    : handleKey === initialHandle
      ? ""
      : null;

  useEffect(() => {
    if (!open || formatAvailability !== null) return;
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
          handleHint(body?.reason ?? null, body?.available ?? null),
        );
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, handleKey, formatAvailability]);

  const shownAvailability =
    formatAvailability !== null ? formatAvailability : availability;

  const trapFocus = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0]!;
    const last = focusable[focusable.length - 1]!;
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last.focus();
      }
    } else if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  const discard = () => {
    if (busy) return;
    onClose();
  };

  const save = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const input: AccountSettingsInput = { name, handle, city };
    const result = await saveAccountSettings(input);
    if (!result.ok) {
      setError(
        result.error === "taken"
          ? "That address is taken."
          : result.error === "handle"
            ? "Check your page address."
            : result.error === "name"
              ? "Enter a name."
              : "Could not save.",
      );
      setBusy(false);
      return;
    }
    setBusy(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="dialog-scrim">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dialog-card w-[min(560px,calc(100vw-32px))] px-8 pb-6 pt-8 text-ink"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            discard();
            return;
          }
          trapFocus(event);
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id={titleId}
            className="font-writing text-[22px] leading-tight text-ink"
          >
            Settings
          </h2>
          <button
            type="button"
            className="icon-btn"
            aria-label="Close"
            onClick={discard}
          >
            <span aria-hidden className="font-ui text-[18px] leading-none">
              ×
            </span>
          </button>
        </div>

        <div className="mt-8 flex flex-col gap-6">
          <label className="block">
            <span className="font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
              Your page
            </span>
            <div className="field-underline-wrap mt-2 flex items-baseline font-ui text-[14px]">
              <input
                type="text"
                value={handle}
                spellCheck={false}
                autoComplete="off"
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                className="min-w-0 flex-1 bg-transparent py-1 text-ink"
              />
              <span className="shrink-0 text-label">.{domain}</span>
            </div>
            <span className="mt-2 block font-ui text-[12px] text-label">
              Lowercase letters, numbers and hyphens. Changing it later moves
              your page; old links redirect for 90 days.
              {shownAvailability ? ` ${shownAvailability}` : ""}
            </span>
          </label>

          <label className="block">
            <span className="font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
              Name
            </span>
            <input
              type="text"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              className="field-underline mt-2 w-full py-1 font-ui text-[14px] text-ink"
            />
            <span className="mt-2 block font-ui text-[12px] text-label">
              Signs your receipts: “{name.trim() || "…"} wrote this by hand.”
            </span>
          </label>

          <label className="block">
            <span className="font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
              City
            </span>
            <input
              type="text"
              value={city}
              maxLength={80}
              onChange={(e) => setCity(e.target.value)}
              className="field-underline mt-2 w-full py-1 font-ui text-[14px] text-ink"
            />
            <span className="mt-2 block font-ui text-[12px] text-label">
              Sets the weather in your window. City-level only, never shown on
              your pages.
            </span>
          </label>

          <div>
            <p className="font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
              Sign-in
            </p>
            <div className="mt-2 flex flex-col gap-2 font-ui text-[13px] text-label">
              {googleEnabled ? (
                googleLinked ? (
                  <p>Google — connected</p>
                ) : (
                  <form action={connectGoogle}>
                    <button
                      type="submit"
                      className="w-fit text-ink underline decoration-transparent underline-offset-4 hover:decoration-ink"
                    >
                      Connect Google
                    </button>
                  </form>
                )
              ) : null}
              <p>Email link · {email} — on</p>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mt-4 font-ui text-[12px] text-label">{error}</p>
        ) : null}

        <div className="dialog-actions mt-8 flex items-center justify-end gap-3">
          <button
            type="button"
            className="font-ui text-[13px] text-label underline decoration-transparent underline-offset-4 hover:text-ink hover:decoration-ink"
            disabled={busy}
            onClick={discard}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            className="h-11 rounded px-[22px] bg-ink font-ui text-[13px] text-white disabled:opacity-40"
            onClick={() => {
              void save();
            }}
          >
            {busy ? "Saving" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
