"use client";

import { BackIcon } from "@/components/icons/LonghandIcons";
import { PAGES_ARIA_LABEL, PAGES_HREF } from "@/lib/dashboard/layout";
import Link from "next/link";

/** Fixed Pages back control for the owner on a published piece page. */
export function PagesBackLink() {
  return (
    <div className="editor-bar">
      <Link
        href={PAGES_HREF}
        aria-label={PAGES_ARIA_LABEL}
        className="editor-bar-btn pages-back min-h-0 shrink-0"
      >
        <BackIcon />
        Pages
      </Link>
    </div>
  );
}
