"use client";

import { createPiece, createResponsePiece } from "@/app/actions/pieces";
import { useState } from "react";

type NewPieceActionsProps = {
  startRespondOpen?: boolean;
};

export function NewPieceActions({
  startRespondOpen = false,
}: NewPieceActionsProps) {
  const [respondOpen, setRespondOpen] = useState(startRespondOpen);

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <form action={createPiece}>
          <button
            type="submit"
            className="rounded-[6px] bg-lamp px-3 py-1.5 font-ui text-[12px] text-ink"
          >
            Blank page
          </button>
        </form>
        <button
          type="button"
          className="font-ui text-[12px] text-ink/70 underline-offset-2 hover:underline"
          onClick={() => setRespondOpen((open) => !open)}
        >
          Respond to something
        </button>
      </div>

      {respondOpen ? (
        <form
          action={createResponsePiece}
          className="flex w-full max-w-sm flex-col gap-2 sm:flex-row sm:items-center"
        >
          <input
            type="url"
            name="url"
            required
            placeholder="https://"
            className="min-w-0 flex-1 border-b border-ink/20 bg-transparent py-1 font-ui text-[12px] text-ink outline-none"
          />
          <button
            type="submit"
            className="rounded-[6px] bg-lamp px-3 py-1.5 font-ui text-[12px] text-ink"
          >
            Start
          </button>
        </form>
      ) : null}
    </div>
  );
}
