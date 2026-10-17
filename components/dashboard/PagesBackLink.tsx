"use client";

import { BackIcon } from "@/components/icons/LonghandIcons";
import { PAGES_ARIA_LABEL, PAGES_HREF } from "@/lib/dashboard/layout";
import Link from "next/link";

type PagesBackLinkProps = {
  /** Fades with the editor bar while typing. Defaults to visible. */
  visible?: boolean;
};

/**
 * Arrow-only back control at the top left (DESIGN.md).
 * Used in the editor and on the owner's published piece page.
 */
export function PagesBackLink({ visible = true }: PagesBackLinkProps) {
  return (
    <Link
      href={PAGES_HREF}
      aria-label={PAGES_ARIA_LABEL}
      data-tooltip="Pages"
      data-pages-back
      className="pages-back-arrow icon-btn"
      style={{
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
    >
      <BackIcon />
    </Link>
  );
}
