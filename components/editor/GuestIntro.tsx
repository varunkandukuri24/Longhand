"use client";

import { Seal } from "@/components/receipt/Seal";
import type { ExampleSignature } from "@/lib/landing/example-signature";

type GuestIntroProps = {
  visible: boolean;
  fading: boolean;
  example: ExampleSignature | null;
};

export function GuestIntro({ visible, fading, example }: GuestIntroProps) {
  if (!visible && !fading) return null;

  return (
    <div
      className={["guest-intro", fading ? "guest-intro-fade" : ""]
        .filter(Boolean)
        .join(" ")}
      aria-hidden={fading}
    >
      <h1 className="guest-intro-headline">Prove you write it, not AI</h1>
      <p className="guest-intro-body">
        Write here. When you publish, your piece ends with a record of how it
        was written.
      </p>
      {example ? (
        <a href={example.href} className="guest-intro-example">
          <p className="guest-intro-example-label">
            <span className="guest-intro-example-label-full">
              WHAT READERS SEE AT THE END
            </span>
            <span className="guest-intro-example-label-short">
              WHAT READERS SEE
            </span>
          </p>
          <div className="guest-intro-example-body">
            <Seal size={34} />
            <div className="guest-intro-example-text">
              <p className="guest-intro-example-sentence">{example.sentence}</p>
              {example.meta ? (
                <p className="guest-intro-example-meta">{example.meta}</p>
              ) : null}
            </div>
          </div>
        </a>
      ) : null}
      <div className="guest-intro-rule" aria-hidden />
    </div>
  );
}
