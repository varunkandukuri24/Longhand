"use client";

import {
  createPhoneTypingController,
  isKeyboardOpen,
  keyboardInsetPx,
} from "@/lib/editor/phone-typing";
import { useCallback, useEffect, useRef, useState } from "react";

export function usePhoneTyping(enabled: boolean): {
  typingActive: boolean;
  keyboardOpen: boolean;
  keyboardInset: number;
  noteInput: () => void;
  release: () => void;
} {
  const [typingActive, setTypingActive] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const controllerRef = useRef<ReturnType<
    typeof createPhoneTypingController
  > | null>(null);
  const keyboardOpenRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      controllerRef.current?.dispose();
      controllerRef.current = null;
      keyboardOpenRef.current = false;
      return;
    }

    const controller = createPhoneTypingController(setTypingActive);
    controllerRef.current = controller;

    const readViewport = () => {
      const visual = window.visualViewport;
      const layoutHeight = window.innerHeight;
      const visualHeight = visual?.height ?? layoutHeight;
      const offsetTop = visual?.offsetTop ?? 0;
      const open = isKeyboardOpen(layoutHeight, visualHeight);
      const inset = open
        ? keyboardInsetPx(layoutHeight, visualHeight, offsetTop)
        : 0;
      setKeyboardInset(inset);
      if (keyboardOpenRef.current && !open) {
        controller.release();
      }
      keyboardOpenRef.current = open;
      setKeyboardOpen(open);
    };

    const visual = window.visualViewport;
    readViewport();
    visual?.addEventListener("resize", readViewport);
    visual?.addEventListener("scroll", readViewport);
    window.addEventListener("resize", readViewport);
    return () => {
      controller.dispose();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
      visual?.removeEventListener("resize", readViewport);
      visual?.removeEventListener("scroll", readViewport);
      window.removeEventListener("resize", readViewport);
    };
  }, [enabled]);

  const noteInput = useCallback(() => {
    controllerRef.current?.noteInput();
  }, []);

  const release = useCallback(() => {
    controllerRef.current?.release();
  }, []);

  return {
    typingActive: enabled && typingActive,
    keyboardOpen: enabled && keyboardOpen,
    keyboardInset: enabled ? keyboardInset : 0,
    noteInput,
    release,
  };
}
