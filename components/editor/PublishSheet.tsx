"use client";

import { Seal } from "@/components/receipt/Seal";
import { useAmbientSceneContext } from "@/components/scene/ambient-context";
import type { PieceVisibility } from "@/lib/pieces/publish";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";

export type PublishResultState = {
  url: string;
  visibility: PieceVisibility;
  signatureLine: string;
};

type PublishSheetProps = {
  open: boolean;
  initialTitle: string;
  handle: string;
  domain: string;
  busy: boolean;
  error: string | null;
  published: PublishResultState | null;
  publishButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onPublish: (args: { title: string; visibility: PieceVisibility }) => void;
  onBackToPages: () => void;
  onOpenPage: (url: string) => void;
};

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
      style={{ borderColor: selected ? "#1C1A16" : "#CFC9BE" }}
    >
      {selected ? (
        <span className="h-2 w-2 rounded-full bg-ink" />
      ) : null}
    </span>
  );
}

export function PublishSheet({
  open,
  initialTitle,
  handle,
  domain,
  busy,
  error,
  published,
  publishButtonRef,
  onClose,
  onPublish,
  onBackToPages,
  onOpenPage,
}: PublishSheetProps) {
  const { setWindowLocked } = useAmbientSceneContext();
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLInputElement | null>(null);
  const [title, setTitle] = useState(initialTitle);
  const [visibility, setVisibility] = useState<PieceVisibility>("public");
  const [wasOpen, setWasOpen] = useState(open);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setWindowLocked(open);
    return () => setWindowLocked(false);
  }, [open, setWindowLocked]);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setTitle(initialTitle);
      setVisibility("public");
      setCopied(false);
    }
  }

  useEffect(() => {
    if (!open || published) return;
    const id = window.requestAnimationFrame(() => {
      titleRef.current?.focus();
      titleRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [open, published]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const publishButton = publishButtonRef.current;
    return () => {
      if (publishButton) {
        publishButton.focus();
      } else if (previous instanceof HTMLElement) {
        previous.focus();
      }
    };
  }, [open, publishButtonRef]);

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
      if (published) {
        onBackToPages();
      } else {
        onClose();
      }
      return;
    }
    trapFocus(event);
  };

  async function copyLink() {
    if (!published) return;
    try {
      await navigator.clipboard.writeText(published.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  if (!open) {
    return null;
  }

  const publicHint = `On your page, ${handle}.${domain}, and for anyone with the link.`;

  return (
    <div className="dialog-scrim">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="dialog-card w-[min(520px,calc(100vw-32px))] px-8 pb-6 pt-8 text-ink"
        onKeyDown={onKeyDown}
      >
        {published ? (
          <>
            <div className="flex items-start gap-4">
              <Seal />
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="font-writing text-[26px] leading-tight text-ink"
                >
                  Published.
                </h2>
                <p className="mt-1 font-ui text-[12.5px] text-label">
                  {published.signatureLine}
                </p>
              </div>
            </div>

            <p className="mt-6 font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
              {published.visibility === "public"
                ? "On your page · Public"
                : "Private · Only people with the link"}
            </p>

            <div className="mt-3 flex h-12 items-center gap-3 rounded-[6px] border border-[#E6E0D4] px-3">
              <span className="min-w-0 flex-1 truncate font-ui text-[13px] text-ink">
                {published.url}
              </span>
              <button
                type="button"
                className="shrink-0 font-ui text-[13px] text-label underline decoration-transparent underline-offset-4 hover:text-ink hover:decoration-ink"
                onClick={() => {
                  void copyLink();
                }}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="font-ui text-[13px] text-label underline decoration-transparent underline-offset-4 hover:text-ink hover:decoration-ink"
                onClick={onBackToPages}
              >
                Back to pages
              </button>
              <button
                type="button"
                className="h-11 rounded px-[22px] bg-ink font-ui text-[13px] text-white"
                onClick={() => onOpenPage(published.url)}
              >
                Open the page
              </button>
            </div>
          </>
        ) : (
          <>
            <h2
              id={titleId}
              className="font-writing text-[26px] leading-tight text-ink"
            >
              Publish
            </h2>

            <label className="mt-6 block">
              <span className="font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
                Title
              </span>
              <input
                ref={titleRef}
                type="text"
                value={title}
                disabled={busy}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title"
                className="field-underline mt-2 w-full py-1 font-writing text-[20px] text-ink placeholder:text-[#A8A196]"
              />
            </label>

            <fieldset className="mt-6 border-0 p-0">
              <legend className="font-ui text-[11px] tracking-[0.14em] text-[#9A9387] uppercase">
                Who can read it
              </legend>
              <div className="mt-3 flex flex-col gap-2.5">
                {(
                  [
                    {
                      value: "public" as const,
                      label: "Public",
                      hint: publicHint,
                    },
                    {
                      value: "private" as const,
                      label: "Private",
                      hint: "Only people you send the link to. Not on your page, not in search.",
                    },
                  ] as const
                ).map((option) => {
                  const selected = visibility === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      disabled={busy}
                      onClick={() => setVisibility(option.value)}
                      className="flex w-full items-start gap-3 rounded-md px-4 py-3.5 text-left"
                      style={{
                        borderWidth: 1,
                        borderStyle: "solid",
                        borderColor: selected ? "#1C1A16" : "#E6E0D4",
                      }}
                    >
                      <RadioDot selected={selected} />
                      <span className="min-w-0">
                        <span className="block font-writing text-[18px] text-ink">
                          {option.label}
                        </span>
                        <span className="mt-0.5 block font-ui text-[12px] text-label">
                          {option.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <p className="mt-5 font-ui text-[12px] text-label">
              Publishing freezes the text and adds its receipt. You can change
              who can read it later.
            </p>

            {error ? (
              <p className="mt-4 font-ui text-[12px] text-label">{error}</p>
            ) : null}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="font-ui text-[13px] text-label underline decoration-transparent underline-offset-4 hover:text-ink hover:decoration-ink"
                disabled={busy}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || title.trim().length === 0}
                className="h-11 rounded px-[22px] bg-ink font-ui text-[13px] text-white disabled:opacity-40"
                onClick={() =>
                  onPublish({ title: title.trim(), visibility })
                }
              >
                {busy ? "Publishing" : "Publish"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
