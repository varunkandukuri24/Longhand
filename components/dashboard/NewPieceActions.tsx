"use client";

import { createPiece, createResponsePiece } from "@/app/actions/pieces";
import { PlusIcon, QuoteIcon } from "@/components/icons/LonghandIcons";
import { useEffect, useId, useRef, useState } from "react";

type NewPieceActionsProps = {
  startRespondOpen?: boolean;
};

export function NewPieceActions({
  startRespondOpen = false,
}: NewPieceActionsProps) {
  const [respondOpen, setRespondOpen] = useState(startRespondOpen);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!respondOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setRespondOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setRespondOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [respondOpen]);

  return (
    <div ref={rootRef} className="flex flex-wrap items-center gap-1">
      <form action={createPiece}>
        <button
          type="submit"
          className="icon-btn"
          aria-label="New page"
          data-tooltip="New page"
        >
          <PlusIcon />
        </button>
      </form>

      <div className="relative">
        <button
          type="button"
          className="icon-btn"
          aria-label="Respond to a link"
          aria-expanded={respondOpen}
          aria-controls={panelId}
          data-tooltip="Respond to a link"
          onClick={() => setRespondOpen((open) => !open)}
        >
          <QuoteIcon />
        </button>
        {respondOpen ? (
          <form
            id={panelId}
            action={createResponsePiece}
            className="editor-popover left-0 right-auto min-w-[220px]"
            role="dialog"
            aria-label="Respond to a link"
          >
            <label className="flex flex-col gap-2 font-ui text-[12px] text-label">
              URL
              <input
                type="url"
                name="url"
                required
                autoFocus
                placeholder="https://"
                className="border-b border-ink/20 bg-transparent py-1 font-ui text-[12px] text-ink outline-none"
              />
            </label>
            <button type="submit" className="editor-bar-btn mt-3 min-h-0">
              Start
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
