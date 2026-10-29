"use client";

type GuestChromeProps = {
  visible: boolean;
  inlineFade?: boolean;
  examplePieceUrl: string | null;
  onSignIn: () => void;
};

export function GuestChrome({
  visible,
  inlineFade = true,
  examplePieceUrl,
  onSignIn,
}: GuestChromeProps) {
  return (
    <>
      <p
        className="guest-brand"
        style={
          inlineFade
            ? {
                opacity: visible ? 1 : 0,
              }
            : undefined
        }
        aria-hidden={!visible}
      >
        Longhand
      </p>
      <div
        className="guest-links"
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
        {examplePieceUrl ? (
          <>
            <a
              href={examplePieceUrl}
              className="guest-example-link"
              tabIndex={visible ? 0 : -1}
            >
              See an example
            </a>
            <span className="guest-links-sep" aria-hidden>
              {" · "}
            </span>
          </>
        ) : null}
        <button
          type="button"
          className="guest-signin-link"
          tabIndex={visible ? 0 : -1}
          onClick={onSignIn}
        >
          Sign in
        </button>
      </div>
    </>
  );
}
