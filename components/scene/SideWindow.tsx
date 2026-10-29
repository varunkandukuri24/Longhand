"use client";

import {
  captionFor,
  SIDE_WINDOW_SCENE_OPTS,
  TOP_WINDOW_SCENE_OPTS,
  windowSceneFor,
  type Condition,
  type Light,
  type WindowScene,
  type WindowSide,
  type WindowSun,
} from "@/lib/scene";
import {
  shouldCrossfadeScene,
  withNoSceneTransition,
} from "@/lib/scene/scene-visibility";
import { useEffect, useRef, useState } from "react";

export type WindowPlacement = "side" | "top";

type SideWindowProps = {
  light: Light;
  condition: Condition;
  side: WindowSide;
  still: boolean;
  instant?: boolean;
  /** Shorten scene transitions from 3 minutes to 5 seconds (debug). */
  fastTransitions?: boolean;
  /** Tall side window, or the short top strip on phones. */
  placement?: WindowPlacement;
  className?: string;
};

type Layer = {
  key: string;
  scene: WindowScene;
};

type SunVisual = {
  left: string;
  top: string;
  width: string;
  background: string;
  boxShadow: string;
  opacity: number;
};

const MOON_STYLE: React.CSSProperties = {
  left: "72%",
  top: "12%",
  width: "13cqmin",
  aspectRatio: "1",
  borderRadius: "50%",
  boxShadow: "inset 3.4cqmin -1.6cqmin 0 0 #F2E8CC",
};

function sunHalo(size: number, halo: string): string {
  return `0 0 0 ${(size * 0.3).toFixed(2)}cqmin ${halo}`;
}

function sunFromScene(sun: WindowSun): SunVisual {
  return {
    left: `${sun.x}%`,
    top: `${sun.y}%`,
    width: `${sun.size}cqmin`,
    background: sun.color,
    boxShadow: sunHalo(sun.size, sun.halo),
    opacity: 1,
  };
}

/**
 * Target for the persistent sun. Weather clear→not: fade out in place.
 * Golden/clear → night: sink to top 100% behind the roofs.
 */
function sunTarget(
  prev: WindowScene | null,
  next: WindowScene,
): SunVisual | null {
  if (next.sun) {
    return sunFromScene(next.sun);
  }
  if (prev?.sun) {
    const settingBehindRoofs = next.moon;
    return {
      left: `${prev.sun.x}%`,
      top: settingBehindRoofs ? "100%" : `${prev.sun.y}%`,
      width: `${prev.sun.size}cqmin`,
      background: prev.sun.color,
      boxShadow: sunHalo(prev.sun.size, prev.sun.halo),
      opacity: 0,
    };
  }
  return null;
}

/**
 * Tall narrow window from DESIGN.md.
 * Sun and moon stay mounted across scene changes; everything else crossfades.
 * Layer order: sky+back → moon → sun → roofs+front.
 */
function sceneOptsFor(placement: WindowPlacement) {
  return placement === "top" ? TOP_WINDOW_SCENE_OPTS : SIDE_WINDOW_SCENE_OPTS;
}

export function SideWindow({
  light,
  condition,
  side,
  still,
  instant = false,
  fastTransitions = false,
  placement = "side",
  className = "",
}: SideWindowProps) {
  const caption = captionFor(light, condition);
  const [base, setBase] = useState<Layer>(() => ({
    key: `${light}-${condition}`,
    scene: windowSceneFor(light, condition, sceneOptsFor(placement)),
  }));
  const [overlay, setOverlay] = useState<Layer | null>(null);
  const [overlayOn, setOverlayOn] = useState(false);
  const shownKeyRef = useRef(`${light}-${condition}`);
  const prevSceneRef = useRef<WindowScene>(base.scene);
  const overlayRef = useRef<Layer | null>(null);
  const placementRef = useRef(placement);
  const [sun, setSun] = useState<SunVisual | null>(() =>
    base.scene.sun ? sunFromScene(base.scene.sun) : null,
  );
  const [moonOn, setMoonOn] = useState(base.scene.moon);
  const [celestialReady, setCelestialReady] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const noMotion = instant || still || reduceMotion;
  const transitionMs = noMotion ? 0 : fastTransitions ? 5000 : 180_000;

  useEffect(() => {
    overlayRef.current = overlay;
  }, [overlay]);

  useEffect(() => {
    const id = window.requestAnimationFrame(() => setCelestialReady(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) return;
      const mid = overlayRef.current;
      if (!mid) return;
      // Finish any in-progress crossfade immediately on return.
      withNoSceneTransition(rootRef.current, () => {
        shownKeyRef.current = mid.key;
        prevSceneRef.current = mid.scene;
        setBase(mid);
        setOverlay(null);
        setOverlayOn(false);
        setMoonOn(mid.scene.moon);
        setSun(mid.scene.sun ? sunFromScene(mid.scene.sun) : null);
      });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const nextKey = `${light}-${condition}`;
    const nextScene = windowSceneFor(
      light,
      condition,
      sceneOptsFor(placement),
    );
    const placementChanged = placementRef.current !== placement;
    placementRef.current = placement;

    if (nextKey === shownKeyRef.current) {
      if (!placementChanged) return;
      withNoSceneTransition(rootRef.current, () => {
        prevSceneRef.current = nextScene;
        setBase({ key: nextKey, scene: nextScene });
        setOverlay(null);
        setOverlayOn(false);
        setMoonOn(nextScene.moon);
        setSun(nextScene.sun ? sunFromScene(nextScene.sun) : null);
      });
      return;
    }

    shownKeyRef.current = nextKey;
    const next: Layer = { key: nextKey, scene: nextScene };
    const prev = prevSceneRef.current;
    const crossfade = shouldCrossfadeScene({
      documentHidden: typeof document !== "undefined" && document.hidden,
      noMotion,
    });

    prevSceneRef.current = nextScene;

    if (!crossfade) {
      withNoSceneTransition(rootRef.current, () => {
        setBase(next);
        setOverlay(null);
        setOverlayOn(false);
        setMoonOn(nextScene.moon);
        setSun(nextScene.sun ? sunFromScene(nextScene.sun) : null);
      });
      return;
    }

    if (nextScene.sun && !prev.sun) {
      if (prev.moon) {
        const rising: SunVisual = {
          ...sunFromScene(nextScene.sun),
          top: "100%",
          opacity: 1,
        };
        setSun(rising);
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            setSun(sunFromScene(nextScene.sun!));
          });
        });
      } else {
        setSun({ ...sunFromScene(nextScene.sun), opacity: 0 });
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            setSun(sunFromScene(nextScene.sun!));
          });
        });
      }
    } else {
      setSun(sunTarget(prev, nextScene));
    }
    setMoonOn(nextScene.moon);

    setOverlay(next);
    setOverlayOn(false);
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setOverlayOn(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [light, condition, noMotion, placement]);

  const durationStyle = {
    ["--scene-fade-ms" as string]: `${transitionMs}ms`,
  } as React.CSSProperties;

  const motionClass =
    celestialReady && transitionMs > 0 ? "side-window-celestial-motion" : "";

  return (
    <div
      ref={rootRef}
      role="img"
      aria-label={`Window: ${caption}`}
      className={[
        "side-window",
        placement === "top" ? "side-window-top" : "",
        side === "left" ? "side-window-left" : "side-window-right",
        still || reduceMotion ? "side-window-still" : "",
        className,
      ].join(" ")}
      data-window-placement={placement}
      style={durationStyle}
    >
      {/* Sky + back only (no sun/moon). */}
      <Pane scene={base.scene} opacity={1} part="back" />
      {overlay ? (
        <Pane
          scene={overlay.scene}
          opacity={overlayOn ? 1 : 0}
          part="back"
          fading
          onFadeInComplete={() => {
            setBase(overlay);
            setOverlay(null);
            setOverlayOn(false);
          }}
        />
      ) : null}

      <span
        className={["side-window-moon", motionClass].join(" ")}
        aria-hidden
        style={{ ...MOON_STYLE, opacity: moonOn ? 1 : 0 }}
      />

      {sun ? (
        <span
          className={["side-window-sun", motionClass].join(" ")}
          aria-hidden
          style={{
            left: sun.left,
            top: sun.top,
            width: sun.width,
            background: sun.background,
            boxShadow: sun.boxShadow,
            opacity: sun.opacity,
          }}
        />
      ) : null}

      {/* Roofs + front sit above the sun so it can set behind the rooftops. */}
      <Pane scene={base.scene} opacity={1} part="front" />
      {overlay ? (
        <Pane
          scene={overlay.scene}
          opacity={overlayOn ? 1 : 0}
          part="front"
          fading
        />
      ) : null}

      <span className="side-window-glazing side-window-glazing-25" />
      <span className="side-window-glazing side-window-glazing-50" />
      <span className="side-window-glazing side-window-glazing-75" />
    </div>
  );
}

function Pane({
  scene,
  opacity,
  part,
  fading = false,
  onFadeInComplete,
}: {
  scene: WindowScene;
  opacity: number;
  part: "back" | "front";
  fading?: boolean;
  onFadeInComplete?: () => void;
}) {
  return (
    <div
      className={[
        fading ? "side-window-pane side-window-pane-fade" : "side-window-pane",
        part === "front" ? "side-window-pane-front" : "",
      ].join(" ")}
      style={
        {
          opacity,
          background: part === "back" ? scene.sky : "transparent",
          ["--ground-h" as string]: scene.groundH,
        } as React.CSSProperties
      }
      onTransitionEnd={(e) => {
        if (
          fading &&
          part === "back" &&
          e.propertyName === "opacity" &&
          opacity >= 1 &&
          onFadeInComplete
        ) {
          onFadeInComplete();
        }
      }}
    >
      {part === "back"
        ? scene.back.map((el, i) => (
            <span
              key={`b-${i}`}
              className="side-window-el"
              data-kind={el.kind}
              style={parseStyle(el.style)}
            />
          ))
        : null}
      {part === "front" ? (
        <>
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
        </>
      ) : null}
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
