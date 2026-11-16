"use client";

import { Seal } from "@/components/receipt/Seal";

type GuestReceiptCardProps = {
  visible: boolean;
  inlineFade?: boolean;
  sentence: string;
  meta: string;
  showSignIn: boolean;
  onSignIn: () => void;
  onDismiss: () => void;
};

export function GuestReceiptCard({
  visible,
  inlineFade = true,
  sentence,
  meta,
  showSignIn,
  onSignIn,
  onDismiss,
}: GuestReceiptCardProps) {
  return (
    <div
      className="guest-receipt dialog-card"
      role="status"
      style={
        inlineFade
          ? {
              opacity: visible ? 1 : 0,
              pointerEvents: visible ? "auto" : "none",
            }
          : undefined
      }
      aria-hidden={!visible}
    >
      <button
        type="button"
        className="guest-receipt-close"
        aria-label="Hide"
        tabIndex={visible ? 0 : -1}
        onClick={onDismiss}
      >
        ×
      </button>
      <p className="guest-receipt-label">YOUR RECEIPT SO FAR</p>
      <div className="guest-receipt-body">
        <Seal size={34} />
        <div className="guest-receipt-text">
          <p className="guest-receipt-sentence">{sentence}</p>
          <p className="guest-receipt-meta">{meta}</p>
        </div>
      </div>
      {showSignIn ? (
        <>
          <p className="guest-receipt-copy">
            This isn&apos;t saved to an account yet.
          </p>
          <button
            type="button"
            className="guest-receipt-button"
            tabIndex={visible ? 0 : -1}
            onClick={onSignIn}
          >
            Sign in to keep it
          </button>
        </>
      ) : (
        <p className="guest-receipt-copy">
          It grows as you write. Publish to put it under your piece.
        </p>
      )}
    </div>
  );
}
