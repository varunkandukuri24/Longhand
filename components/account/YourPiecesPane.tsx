"use client";

import { createPiece } from "@/app/actions/pieces";
import {
  loadYourPieces,
  type PanePiece,
} from "@/app/actions/list-pieces";
import { HistoryIcon, PlusIcon } from "@/components/icons/LonghandIcons";
import { useAmbientSceneContext } from "@/components/scene/ambient-context";
import {
  groupPiecesByRecency,
  pieceMetaLine,
} from "@/lib/pieces/group-pieces";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

type YourPiecesPaneProps = {
  visible: boolean;
  inlineFade?: boolean;
  currentPieceId?: string | null;
  handle: string;
  domain: string;
  writerPageHref: string;
};

export function YourPiecesPane({
  visible: chromeVisible,
  inlineFade = true,
  currentPieceId,
  handle,
  domain,
  writerPageHref,
}: YourPiecesPaneProps) {
  const router = useRouter();
  const { setWindowLocked } = useAmbientSceneContext();
  const [open, setOpen] = useState(false);
  const [pieces, setPieces] = useState<PanePiece[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const openPane = useCallback(() => {
    setOpen(true);
    setLoading(true);
    setQuery("");
    void loadYourPieces(currentPieceId).then((list) => {
      setPieces(list);
      setLoading(false);
      window.requestAnimationFrame(() => searchRef.current?.focus());
    });
  }, [currentPieceId]);

  useEffect(() => {
    setWindowLocked(open);
    return () => setWindowLocked(false);
  }, [open, setWindowLocked]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const trapFocus = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
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
  };

  const filtered = query.trim()
    ? pieces.filter((p) => p.searchText.includes(query.trim().toLowerCase()))
    : pieces;
  const groups = groupPiecesByRecency(filtered);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="history-icon icon-btn"
        aria-label="Your pieces"
        aria-expanded={open}
        style={
          inlineFade
            ? {
                opacity: chromeVisible ? 1 : 0,
                pointerEvents: chromeVisible ? "auto" : "none",
              }
            : undefined
        }
        aria-hidden={!chromeVisible}
        tabIndex={chromeVisible ? 0 : -1}
        onClick={openPane}
      >
        <HistoryIcon />
      </button>

      {open ? (
        <div className="your-pieces-root">
          <button
            type="button"
            className="your-pieces-scrim"
            aria-label="Close your pieces"
            onClick={close}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="your-pieces-pane"
            onKeyDown={trapFocus}
          >
            <div className="flex items-center justify-between gap-3">
              <h2
                id={titleId}
                className="font-writing text-[22px] leading-tight text-ink"
              >
                Your pieces
              </h2>
              <button
                type="button"
                className="icon-btn"
                aria-label="Close"
                onClick={close}
              >
                <span aria-hidden className="font-ui text-[18px] leading-none">
                  ×
                </span>
              </button>
            </div>

            <form action={createPiece} className="mt-5">
              <button
                type="submit"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#E6E0D4] font-ui text-[13px] text-ink"
              >
                <PlusIcon size={16} />
                New piece
              </button>
            </form>

            <label className="mt-4 block">
              <span className="sr-only">Search your pieces</span>
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search your pieces"
                className="w-full border-0 border-b border-[#E6E0D4] bg-transparent py-2 font-ui text-[13px] text-ink outline-none placeholder:text-label"
              />
            </label>

            <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
              {loading ? (
                <p className="font-ui text-[12px] text-label">Loading</p>
              ) : groups.length === 0 ? (
                <p className="font-ui text-[12px] text-label">No pieces yet.</p>
              ) : (
                groups.map((group) => (
                  <section key={group.key} className="mb-5">
                    <h3 className="font-ui text-[11px] tracking-[0.14em] text-[#9A9387]">
                      {group.label}
                    </h3>
                    <ul className="mt-2 flex flex-col gap-0.5">
                      {group.pieces.map((piece) => {
                        const href =
                          piece.status === "published" && piece.slug
                            ? `/p/${piece.slug}`
                            : `/write/${piece.id}`;
                        const current = piece.id === currentPieceId;
                        return (
                          <li key={piece.id}>
                            <button
                              type="button"
                              className={[
                                "w-full rounded-md px-2 py-2 text-left",
                                current ? "bg-[#F4F1EB]" : "",
                              ].join(" ")}
                              onClick={() => {
                                close();
                                router.push(href);
                              }}
                            >
                              <span
                                className={[
                                  "block font-writing text-[17px] leading-snug",
                                  piece.muted ? "text-label" : "text-ink",
                                ].join(" ")}
                              >
                                {piece.label}
                              </span>
                              <span className="mt-0.5 block font-ui text-[11.5px] text-label">
                                {pieceMetaLine(piece)}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                ))
              )}
            </div>

            <p className="mt-4 shrink-0 font-ui text-[11.5px] text-label">
              {pieces.length} {pieces.length === 1 ? "piece" : "pieces"}
              <span className="mx-2 text-label/40">·</span>
              <a
                href={writerPageHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ink underline decoration-ink underline-offset-4"
              >
                {handle}.{domain}
              </a>
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
