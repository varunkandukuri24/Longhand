"use client";

import { trackClient } from "@/lib/analytics/client";

/** "Write on Longhand" on writer subdomain pages (DESIGN.md). */

type WriteOnLonghandLinkProps = {
  /** Absolute URL to the main site, from mainOrigin() on the server. */
  href: string;
};

export function WriteOnLonghandLink({ href }: WriteOnLonghandLinkProps) {
  return (
    <a
      href={href}
      className="write-on-longhand"
      onClick={() => trackClient("write_on_longhand_clicked")}
    >
      Write on Longhand
    </a>
  );
}
