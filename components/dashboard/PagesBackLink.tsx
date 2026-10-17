"use client";

import { BackIcon } from "@/components/icons/LonghandIcons";
import { PAGES_ARIA_LABEL, PAGES_HREF } from "@/lib/dashboard/layout";
import Link from "next/link";

type PagesBackLinkProps = {
  /** Fades with the editor bar while typing. Defaults to visible. */
  visible?: boolean;
  /** Destination; defaults to the Pages dashboard. */
  href?: string;
  /** aria-label (and tooltip, unless this is the Pages default). */
  label?: string;
};

/**
 * Arrow-only back control at the top left (DESIGN.md).
 * Used in the editor, on the owner's published piece page, and on
 * pieces opened from a writer's subdomain page.
 */
export function PagesBackLink({
  visible = true,
  href = PAGES_HREF,
  label = PAGES_ARIA_LABEL,
}: PagesBackLinkProps) {
  const isPagesDefault = href === PAGES_HREF && label === PAGES_ARIA_LABEL;
  const tooltip = isPagesDefault ? "Pages" : label;

  return (
    <Link
      href={href}
      aria-label={label}
      data-tooltip={tooltip}
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
