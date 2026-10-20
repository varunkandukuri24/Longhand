"use client";

import type { PieceVisibility } from "@/lib/pieces/publish";
import { useEffect, useId, useRef, useState } from "react";

type VisibilityControlProps = {
  pieceId: string;
  initialVisibility: PieceVisibility;
};

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
      style={{ borderColor: selected ? "#1C1A16" : "#CFC9BE" }}
    >
      {selected ? <span className="h-2 w-2 rounded-full bg-ink" /> : null}
    </span>
  );
}

export function VisibilityControl({
  pieceId,
  initialVisibility,
}: VisibilityControlProps) {
  const [open, setOpen] = useState(false);
  const [visibility, setVisibility] = useState(initialVisibility);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

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

  async function choose(next: PieceVisibility) {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/pieces/${pieceId}/visibility`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      });
      const body = (await res.json().catch(() => null)) as {
        url?: string;
        visibility?: PieceVisibility;
      } | null;
      if (res.ok && body?.url && body.visibility) {
        setVisibility(body.visibility);
        setUrl(body.url);
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be unavailable */
    }
  }

  const label = visibility === "public" ? "Public" : "Private";

  return (
    <div ref={rootRef} className="visibility-control relative">
      <button
        type="button"
        className="editor-bar-btn min-h-0 px-0 font-ui text-[13px]"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label="Who can read it"
          className="popover-surface absolute right-0 top-full z-[var(--z-popover)] mt-2 w-[min(320px,calc(100vw-2rem))] p-3"
        >
          <div className="flex flex-col gap-2.5">
            {(
              [
                {
                  value: "public" as const,
                  title: "Public",
                  hint: "On your page, and for anyone with the link.",
                },
                {
                  value: "private" as const,
                  title: "Private",
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
                  onClick={() => {
                    void choose(option.value);
                  }}
                  className="flex w-full items-start gap-3 rounded-md px-3 py-3 text-left"
                  style={{
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: selected ? "#1C1A16" : "#E6E0D4",
                  }}
                >
                  <RadioDot selected={selected} />
                  <span className="min-w-0">
                    <span className="block font-writing text-[18px] text-ink">
                      {option.title}
                    </span>
                    <span className="mt-0.5 block font-ui text-[12px] text-label">
                      {option.hint}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {url ? (
            <div className="mt-3 flex items-center gap-2 border-t border-[#EEEAE3] pt-3">
              <span className="min-w-0 flex-1 truncate font-ui text-[12px] text-ink">
                {url}
              </span>
              <button
                type="button"
                className="shrink-0 font-ui text-[12px] text-label underline decoration-transparent underline-offset-4 hover:text-ink hover:decoration-ink"
                onClick={() => {
                  void copyLink();
                }}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
