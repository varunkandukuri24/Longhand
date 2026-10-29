"use client";

import { PaperGrain } from "@/components/scene/PaperGrain";
import { SideWindow } from "@/components/scene/SideWindow";
import {
  AmbientSceneProvider,
  useAmbientSceneContext,
} from "@/components/scene/ambient-context";
import { WINDOW_SIDE } from "@/lib/scene";
import { usePhoneLayout } from "@/lib/scene/use-phone-layout";
import type { CSSProperties, PointerEventHandler, ReactNode } from "react";

type PaperShellProps = {
  children: ReactNode;
  /**
   * Fixed chrome (icons, Your pieces, dialogs). Must sit outside the paper
   * column's stacking context so pane/dialogs paint above the side window.
   */
  chrome?: ReactNode;
  /** Public pages: clear sky, reader's clock. */
  publicPage?: boolean;
  /** Hide the side window (e.g. optional). */
  hideWindow?: boolean;
  className?: string;
  style?: CSSProperties;
  onPointerDown?: PointerEventHandler<HTMLDivElement>;
};

function PaperShellInner({
  children,
  chrome = null,
  hideWindow = false,
  className = "",
  style,
  onPointerDown,
}: Omit<PaperShellProps, "publicPage">) {
  const ambient = useAmbientSceneContext();
  const phone = usePhoneLayout();

  return (
    <div
      className={[
        "relative min-h-dvh w-full bg-paper text-ink",
        ambient.windowSide === "left"
          ? "writing-shell-left"
          : "writing-shell-right",
        className,
      ].join(" ")}
      data-phone-layout={phone ? "" : undefined}
      style={style}
      onPointerDown={onPointerDown}
    >
      <PaperGrain />
      {hideWindow ? null : (
        <SideWindow
          light={ambient.light}
          condition={ambient.condition}
          side={WINDOW_SIDE}
          still={ambient.stillWindow}
          fastTransitions={ambient.fastTransitions}
          placement={phone ? "top" : "side"}
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
  hideWindow = false,
  className = "",
  style,
  onPointerDown,
}: PaperShellProps) {
  return (
    <AmbientSceneProvider publicPage={publicPage}>
      <PaperShellInner
        chrome={chrome}
        hideWindow={hideWindow}
        className={className}
        style={style}
        onPointerDown={onPointerDown}
      >
        {children}
      </PaperShellInner>
    </AmbientSceneProvider>
  );
}
