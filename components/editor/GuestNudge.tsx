"use client";

type GuestNudgeProps = {
  visible: boolean;
  onSignIn: () => void;
  onDismiss: () => void;
};

export function GuestNudge({ visible, onSignIn, onDismiss }: GuestNudgeProps) {
  return (
    <div
      className="guest-nudge dialog-card"
      role="status"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
      aria-hidden={!visible}
    >
      <button
        type="button"
        className="guest-nudge-close"
        aria-label="Hide"
        tabIndex={visible ? 0 : -1}
        onClick={onDismiss}
      >
        ×
      </button>
      <p className="guest-nudge-title">Not saved to an account</p>
      <p className="guest-nudge-copy">
        It lives in this browser for 7 days. Sign in to keep it.
      </p>
      <button
        type="button"
        className="guest-nudge-button"
        tabIndex={visible ? 0 : -1}
        onClick={onSignIn}
      >
        Sign in to keep this
      </button>
    </div>
  );
}
