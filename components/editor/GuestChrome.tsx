"use client";

type GuestChromeProps = {
  visible: boolean;
  examplePieceUrl: string | null;
  onSignIn: () => void;
};

export function GuestChrome({
  visible,
  examplePieceUrl,
  onSignIn,
}: GuestChromeProps) {
  return (
    <>
      <p
        className="guest-brand"
        style={{
          opacity: visible ? 1 : 0,
        }}
        aria-hidden={!visible}
      >
        Longhand
      </p>
      <div
        className="guest-links"
        style={{
          opacity: visible ? 1 : 0,
          pointerEvents: visible ? "auto" : "none",
        }}
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
