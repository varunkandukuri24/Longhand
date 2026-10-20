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
  /**
   * Fixed chrome (icons, Your pieces, dialogs). Must sit outside the paper
   * column's stacking context so pane/dialogs paint above the side window.
   */
  chrome?: ReactNode;
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
  chrome = null,
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
          locked={ambient.windowLocked}
          onSideChange={onSideChange}
        />
      )}
      {/* Above grain only; window (z-10) may paint over the column edge. */}
      <div className="relative z-[2]">{children}</div>
      {/* Sibling of window so --z-bar / --z-pane / --z-dialog win. */}
      {chrome}
    </div>
  );
}

/** Paper + grain + side window shell (used by PaperPage). */
export function PaperShell({
  children,
  chrome = null,
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
        chrome={chrome}
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
