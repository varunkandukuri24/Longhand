"use client";

import { GoogleMark } from "@/components/auth/GoogleMark";
import { useAmbientSceneContext } from "@/components/scene/ambient-context";
import { saveGuestCaret } from "@/lib/guest/caret";
import { signIn } from "next-auth/react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

export type GuestSignInReason =
  | "empty"
  | "keep"
  | "publish"
  | "limit"
  | "create_limit";

type GuestSignInDialogProps = {
  open: boolean;
  reason: GuestSignInReason;
  googleEnabled: boolean;
  emailProviderId: string;
  caretIndex: number;
  onClose: () => void;
};

const COPY: Record<
  GuestSignInReason,
  { title: string; subline: string; footnote: string | null }
> = {
  empty: {
    title: "Sign in",
    subline: "Write, publish and keep everything in one place.",
    footnote: null,
  },
  keep: {
    title: "Keep this page",
    subline:
      "Sign in and it’s yours, with every minute counted from your first word.",
    footnote:
      "Your page stays right here while you sign in. Every minute so far counts toward its receipt.",
  },
  publish: {
    title: "Sign in to publish",
    subline:
      "Your receipt needs a name to sign it with, and your piece needs a page to live on.",
    footnote: null,
  },
  limit: {
    title: "Keep going?",
    subline:
      "You’ve written 500 words as a guest. That’s as far as a page goes without an account.",
    footnote: "Nothing is lost. Sign in and keep going from this exact word.",
  },
  create_limit: {
    title: "Sign in to keep writing",
    subline:
      "Too many new pages have been started from this network today. Sign in and you can write as much as you like.",
    footnote: null,
  },
};

function continuePath(reason: GuestSignInReason): string {
  return `/auth/continue?then=${reason === "publish" ? "publish" : "write"}`;
}

export function GuestSignInDialog({
  open,
  reason,
  googleEnabled,
  emailProviderId,
  caretIndex,
  onClose,
}: GuestSignInDialogProps) {
  const { setWindowLocked } = useAmbientSceneContext();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(open);

  useEffect(() => {
    setWindowLocked(open);
    return () => setWindowLocked(false);
  }, [open, setWindowLocked]);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSentTo(null);
      setEmail("");
      setError(null);
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!open || sentTo) return;
    const id = window.requestAnimationFrame(() => {
      emailRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, sentTo]);

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

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      if (busy) return;
      onClose();
      return;
    }
    trapFocus(event);
  };

  async function onGoogle() {
    saveGuestCaret(caretIndex);
    setBusy(true);
    await signIn("google", { redirectTo: continuePath(reason) });
  }

  async function onEmail(event: FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (!address) return;
    setBusy(true);
    setError(null);
    saveGuestCaret(caretIndex);
    try {
      const result = await signIn(emailProviderId, {
        email: address,
        redirectTo: continuePath(reason),
        redirect: false,
      });
      if (result?.error) {
        setError("Could not send a sign-in link.");
        setBusy(false);
        return;
      }
      setSentTo(address);
    } catch {
      setError("Could not send a sign-in link.");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const copy = COPY[reason];

  return (
    <div className="dialog-scrim dialog-scrim-column">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dialog-card w-[min(460px,calc(100vw-32px))] px-8 pb-6 pt-8 text-ink"
        onKeyDown={onKeyDown}
      >
        {sentTo ? (
          <>
            <h2
              id={titleId}
              className="font-writing text-[26px] leading-tight text-ink"
            >
              Check your email
            </h2>
            <p className="mt-3 font-writing text-[17px] leading-snug text-[#5C564C]">
              We sent a sign-in link to
            </p>
            <p className="mt-3 rounded-[6px] border border-[#E6E0D4] px-3 py-3 font-ui text-[13px] text-ink">
              {sentTo}
            </p>
            <p className="mt-4 font-writing text-[17px] leading-snug text-[#5C564C]">
              Open the link in this browser and you’ll land back here, on this
              page, signed in. Keep writing while you wait.
            </p>
            <div className="dialog-actions mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="font-ui text-[13px] text-label underline decoration-transparent underline-offset-4 hover:text-ink hover:decoration-ink"
                onClick={() => {
                  setSentTo(null);
                  setBusy(false);
                }}
              >
                Use a different email
              </button>
              <button
                type="button"
                className="h-11 rounded px-[22px] bg-ink font-ui text-[13px] text-white"
                onClick={onClose}
              >
                Keep writing
              </button>
            </div>
          </>
        ) : (
          <>
            <h2
              id={titleId}
              className="font-writing text-[26px] leading-tight text-ink"
            >
              {copy.title}
            </h2>
            <p className="mt-3 font-writing text-[17px] leading-snug text-[#5C564C]">
              {copy.subline}
            </p>

            {googleEnabled ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  void onGoogle();
                }}
                className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-md border border-[#CFC9BE] font-ui text-[14px] text-ink disabled:opacity-40"
              >
                <GoogleMark />
                Continue with Google
              </button>
            ) : null}

            {googleEnabled ? (
              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-[#E6E0D4]" />
                <span className="font-ui text-[12px] text-label">or</span>
                <span className="h-px flex-1 bg-[#E6E0D4]" />
              </div>
            ) : (
              <div className="mt-8" />
            )}

            <form className="flex flex-col gap-4" onSubmit={onEmail}>
              <label className="flex flex-col gap-2">
                <span className="font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
                  Email
                </span>
                <input
                  ref={emailRef}
                  type="email"
                  name="email"
                  required
                  autoComplete="email"
                  value={email}
                  disabled={busy}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field-underline py-2 font-ui text-[13px] text-ink"
                />
              </label>
              {error ? (
                <p className="font-ui text-[12px] text-label">{error}</p>
              ) : null}
              <button
                type="submit"
                disabled={busy || email.trim().length === 0}
                className="h-11 w-fit rounded px-[22px] bg-ink font-ui text-[13px] text-white disabled:opacity-40"
              >
                Email me a link
              </button>
            </form>

            {copy.footnote ? (
              <p className="mt-4 font-ui text-[11.5px] text-[#9A9387]">
                {copy.footnote}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
