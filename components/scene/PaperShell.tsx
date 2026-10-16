"use client";

import { saveWindowSide } from "@/app/actions/window-side";
import { PaperGrain } from "@/components/scene/PaperGrain";
import { SideWindow } from "@/components/scene/SideWindow";
import {
  AmbientSceneProvider,
  useAmbientSceneContext,
} from "@/components/scene/ambient-context";
import type { WindowSide } from "@/lib/scene";
import type { PointerEventHandler, ReactNode } from "react";

type PaperShellProps = {
  children: ReactNode;
  /** Public pages: left window, clear sky, reader's clock. */
  publicPage?: boolean;
  initialWindowSide?: WindowSide;
  /** Hide the side window (e.g. optional). */
  hideWindow?: boolean;
  className?: string;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
};

function PaperShellInner({
  children,
  publicPage = false,
  hideWindow = false,
  className = "",
  onPointerDown,
}: Omit<PaperShellProps, "initialWindowSide">) {
  const ambient = useAmbientSceneContext();

  const onSideChange = (side: WindowSide) => {
    if (publicPage) return;
    ambient.setWindowSide(side);
    void saveWindowSide(side);
  };

  return (
    <div
      className={[
        "relative min-h-dvh w-full bg-paper text-ink",
        ambient.windowSide === "left"
          ? "writing-shell-left"
          : "writing-shell-right",
        className,
      ].join(" ")}
      onPointerDown={onPointerDown}
    >
      <PaperGrain />
      {hideWindow ? null : (
        <SideWindow
          light={ambient.light}
          condition={ambient.condition}
          side={ambient.windowSide}
          still={ambient.stillWindow}
          fastTransitions={ambient.fastTransitions}
          onSideChange={onSideChange}
        />
      )}
      <div className="relative z-[2]">{children}</div>
    </div>
  );
}

/** Paper + grain + side window shell (used by PaperPage). */
export function PaperShell({
  children,
  publicPage = false,
  initialWindowSide = "left",
  hideWindow = false,
  className = "",
  onPointerDown,
}: PaperShellProps) {
  return (
    <AmbientSceneProvider
      publicPage={publicPage}
      initialWindowSide={initialWindowSide}
    >
      <PaperShellInner
        publicPage={publicPage}
        hideWindow={hideWindow}
        className={className}
        onPointerDown={onPointerDown}
      >
        {children}
      </PaperShellInner>
    </AmbientSceneProvider>
  );
}
