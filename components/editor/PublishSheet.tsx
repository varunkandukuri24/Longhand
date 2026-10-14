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
    <div className="pointer-events-auto absolute inset-x-4 top-16 z-20 mx-auto w-full max-w-sm rounded-[6px] bg-page px-4 py-4 text-ink shadow-page">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-ui text-[12px] tracking-wide text-ink/70">
          Publish
        </h2>
        <button
          type="button"
          className="font-ui text-[12px] text-ink/50 underline-offset-2 hover:underline"
          onClick={onClose}
          disabled={busy}
        >
          Close
        </button>
      </div>

      <label className="mt-4 block font-ui text-[12px] text-ink/70">
        Title
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={busy}
          className="mt-1.5 w-full border-b border-ink/20 bg-transparent py-1 font-writing text-[18px] text-ink outline-none"
        />
      </label>

      <label className="mt-4 flex cursor-pointer items-center gap-2 font-ui text-[12px] text-ink/70">
        <input
          type="checkbox"
          checked={replayPublic}
          onChange={(e) => setReplayPublic(e.target.checked)}
          disabled={busy}
          className="accent-lamp"
        />
        <span>Show replay</span>
      </label>

      {error ? (
        <p className="mt-3 font-ui text-[12px] text-ink/70">{error}</p>
      ) : null}

      <button
        type="button"
        disabled={busy || title.trim().length === 0}
        className="mt-4 rounded-[6px] bg-lamp px-3 py-1.5 font-ui text-[12px] text-ink disabled:opacity-50"
        onClick={() =>
          onPublish({ title: title.trim(), replayPublic })
        }
      >
        {busy ? "Publishing" : "Publish"}
      </button>
    </div>
  );
}
