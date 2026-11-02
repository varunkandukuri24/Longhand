"use client";

import { visualViewportBox } from "@/lib/editor/editor-viewport";
import { useEffect } from "react";

/** Lock html/body so only the editor's text column scrolls. */
export function useEditorDocumentLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const root = document.documentElement;
    root.classList.add("editor-lock");
    return () => {
      root.classList.remove("editor-lock");
    };
  }, [enabled]);
}

/**
 * Pin the editor shell to the visual viewport on phones. iOS still scrolls
 * the document on focus; we follow that offset and snap scrollY back to 0.
 */
export function useVisualViewportPin(
  enabled: boolean,
  root: HTMLElement | null,
): void {
  useEffect(() => {
    if (!enabled || !root) return;

    let frame = 0;
    const apply = () => {
      frame = 0;
      const box = visualViewportBox(window.visualViewport, window.innerHeight);
      root.style.setProperty("--vv-top", `${box.top}px`);
      root.style.setProperty("--vv-height", `${box.height}px`);
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
    };
    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(apply);
    };

    apply();
    const visual = window.visualViewport;
    visual?.addEventListener("resize", schedule);
    visual?.addEventListener("scroll", schedule);
    window.addEventListener("resize", schedule);
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      visual?.removeEventListener("resize", schedule);
      visual?.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("scroll", schedule);
      root.style.removeProperty("--vv-top");
      root.style.removeProperty("--vv-height");
    };
  }, [enabled, root]);
}
