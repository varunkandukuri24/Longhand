"use client";

import { useEffect, useState } from "react";

type PublishSheetProps = {
  open: boolean;
  initialTitle: string;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onPublish: (args: {
    title: string;
    replayPublic: boolean;
  }) => void;
};

export function PublishSheet({
  open,
  initialTitle,
  busy,
  error,
  onClose,
  onPublish,
}: PublishSheetProps) {
  const [title, setTitle] = useState(initialTitle);
  const [replayPublic, setReplayPublic] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setReplayPublic(false);
    }
  }, [open, initialTitle]);

  if (!open) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-30 flex items-end justify-end px-10 pb-20">
      <div className="pointer-events-auto w-full max-w-sm rounded-[6px] border border-[var(--popover-border)] bg-white px-4 py-4 text-ink shadow-[var(--shadow-popover)]">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-ui text-[13px] text-label">Publish</h2>
          <button
            type="button"
            className="editor-bar-btn min-h-0"
            onClick={onClose}
            disabled={busy}
          >
            Close
          </button>
        </div>

        <label className="mt-4 block font-ui text-[12px] text-label">
          Title
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={busy}
            className="mt-1.5 w-full border-b border-ink/20 bg-transparent py-1 font-writing text-[18px] text-ink outline-none"
          />
        </label>

        <div className="mt-4">
          <label className="flex cursor-pointer items-center gap-2 font-ui text-[12px] text-label">
            <input
              type="checkbox"
              checked={replayPublic}
              onChange={(e) => setReplayPublic(e.target.checked)}
              disabled={busy}
            />
            <span>Show replay</span>
          </label>
          <p className="mt-1.5 pl-6 font-ui text-[11.5px] text-label">
            Shows everything you typed, including what you deleted.
          </p>
        </div>

        {error ? (
          <p className="mt-3 font-ui text-[12px] text-ink">{error}</p>
        ) : null}

        <button
          type="button"
          disabled={busy || title.trim().length === 0}
          className="editor-bar-btn mt-4 disabled:opacity-40"
          onClick={() => onPublish({ title: title.trim(), replayPublic })}
        >
          {busy ? "Publishing" : "Publish"}
        </button>
      </div>
    </div>
  );
}
