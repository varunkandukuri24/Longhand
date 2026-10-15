"use client";

import {
  captionFor,
  windowSceneFor,
  type Condition,
  type Light,
  type WindowScene,
  type WindowSide,
} from "@/lib/scene";
import { useEffect, useRef, useState } from "react";

type SideWindowProps = {
  light: Light;
  condition: Condition;
  side: WindowSide;
  still: boolean;
  instant?: boolean;
  onSideChange: (side: WindowSide) => void;
  className?: string;
};

type Layer = {
  key: string;
  scene: WindowScene;
};

/**
 * Tall narrow window from DESIGN.md. Drag horizontally to snap sides.
 */
export function SideWindow({
  light,
  condition,
  side,
  still,
  instant = false,
  onSideChange,
  className = "",
}: SideWindowProps) {
  const caption = captionFor(light, condition);
  const [base, setBase] = useState<Layer>(() => ({
    key: `${light}-${condition}`,
    scene: windowSceneFor(light, condition),
  }));
  const [overlay, setOverlay] = useState<Layer | null>(null);
  const [overlayOn, setOverlayOn] = useState(false);
  const shownKeyRef = useRef(`${light}-${condition}`);
  const dragRef = useRef<{
    startX: number;
    moved: boolean;
    following: boolean;
  } | null>(null);
  const [dragLeft, setDragLeft] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const nextKey = `${light}-${condition}`;
    if (nextKey === shownKeyRef.current) return;
    shownKeyRef.current = nextKey;
    const next: Layer = {
      key: nextKey,
      scene: windowSceneFor(light, condition),
    };

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (instant || reduceMotion) {
      setBase(next);
      setOverlay(null);
      setOverlayOn(false);
      return;
    }

    setOverlay(next);
    setOverlayOn(false);
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setOverlayOn(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [light, condition, instant]);

  const snapTo = (next: WindowSide) => {
    setDragLeft(null);
    if (next !== side) onSideChange(next);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, moved: false, following: false };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    if (Math.abs(dx) >= 6) drag.moved = true;
    if (Math.abs(dx) >= 24) drag.following = true;
    if (!drag.following) return;

    const el = rootRef.current;
    if (!el) return;
    const width = el.offsetWidth;
    const inset = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--window-inset",
      ),
    );
    const maxLeft = window.innerWidth - inset - width;
    const origin =
      side === "left" ? inset : window.innerWidth - inset - width;
    const next = Math.min(maxLeft, Math.max(inset, origin + dx));
    setDragLeft(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    if (!drag.moved) {
      setDragLeft(null);
      return;
    }
    const el = rootRef.current;
    if (!el) {
      setDragLeft(null);
      return;
    }
    const width = el.offsetWidth;
    const inset = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--window-inset",
      ),
    );
    const currentLeft =
      dragLeft ??
      (side === "left" ? inset : window.innerWidth - inset - width);
    const mid = window.innerWidth / 2;
    snapTo(currentLeft + width / 2 < mid ? "left" : "right");
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      snapTo("left");
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      snapTo("right");
    }
  };

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slide = !reduceMotion && dragLeft === null;

  const style: React.CSSProperties =
    dragLeft !== null
      ? { left: dragLeft, right: "auto" }
      : {};

  return (
    <div
      ref={rootRef}
      role="img"
      tabIndex={0}
      aria-label={`Window: ${caption}`}
      className={[
        "side-window",
        side === "left" ? "side-window-left" : "side-window-right",
        slide ? "side-window-slide" : "",
        still || reduceMotion ? "side-window-still" : "",
        className,
      ].join(" ")}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
    >
      <Pane scene={base.scene} opacity={1} />
      {overlay ? (
        <Pane
          scene={overlay.scene}
          opacity={overlayOn ? 1 : 0}
          fading
          onFadeInComplete={() => {
            setBase(overlay);
            setOverlay(null);
            setOverlayOn(false);
          }}
        />
      ) : null}
      <span className="side-window-glazing" style={{ top: "25%" }} />
      <span className="side-window-glazing" style={{ top: "50%" }} />
      <span className="side-window-glazing" style={{ top: "75%" }} />
    </div>
  );
}

function Pane({
  scene,
  opacity,
  fading = false,
  onFadeInComplete,
}: {
  scene: WindowScene;
  opacity: number;
  fading?: boolean;
  onFadeInComplete?: () => void;
}) {
  return (
    <div
      className={
        fading ? "side-window-pane side-window-pane-fade" : "side-window-pane"
      }
      style={
        {
          opacity,
          background: scene.sky,
          ["--ground-h" as string]: scene.groundH,
        } as React.CSSProperties
      }
      onTransitionEnd={(e) => {
        if (
          fading &&
          e.propertyName === "opacity" &&
          opacity >= 1 &&
          onFadeInComplete
        ) {
          onFadeInComplete();
        }
      }}
    >
      {scene.back.map((el, i) => (
        <span
          key={`b-${i}`}
          className="side-window-el"
          data-kind={el.kind}
          style={parseStyle(el.style)}
        />
      ))}
      <div className="side-window-roofs" aria-hidden>
        <svg
          viewBox="0 0 100 20"
          preserveAspectRatio="none"
          width="100%"
          height="100%"
        >
          {scene.snowCap ? (
            <path
              d={scene.roof}
              fill="#F3F5F8"
              transform="translate(0 -1.4)"
            />
          ) : null}
          <path d={scene.roof} fill={scene.ground} />
        </svg>
      </div>
      {scene.front.map((el, i) => (
        <span
          key={`f-${i}`}
          className="side-window-el"
          data-kind={el.kind}
          style={parseStyle(el.style)}
        />
      ))}
    </div>
  );
}

/** Apply the reference implementation's inline style strings. */
function parseStyle(css: string): React.CSSProperties {
  const style: Record<string, string> = {};
  for (const part of css.split(";")) {
    const idx = part.indexOf(":");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key) continue;
    const camel = key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    style[camel] = value;
  }
  return style as React.CSSProperties;
}
