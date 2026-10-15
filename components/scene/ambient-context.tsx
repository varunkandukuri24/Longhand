"use client";

import {
  useAmbientScene,
  type AmbientSceneState,
} from "@/lib/scene/use-ambient-scene";
import type { WindowSide } from "@/lib/scene";
import { createContext, useContext, type ReactNode } from "react";

const AmbientContext = createContext<AmbientSceneState | null>(null);

export function AmbientSceneProvider({
  children,
  publicPage = false,
  initialWindowSide = "left",
}: {
  children: ReactNode;
  publicPage?: boolean;
  initialWindowSide?: WindowSide;
}) {
  const ambient = useAmbientScene({ publicPage, initialWindowSide });
  return (
    <AmbientContext.Provider value={ambient}>{children}</AmbientContext.Provider>
  );
}

export function useAmbientSceneContext(): AmbientSceneState {
  const value = useContext(AmbientContext);
  if (!value) {
    throw new Error("useAmbientSceneContext must be used within AmbientSceneProvider");
  }
  return value;
}
