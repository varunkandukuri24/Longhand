"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";
import { redact } from "@/lib/analytics/redact";

type VercelAnalyticsProps = {
  rootDomain: string;
};

/** Client wrapper so beforeSend can redact urls from the server layout. */
export function VercelAnalytics({ rootDomain }: VercelAnalyticsProps) {
  return (
    <Analytics
      beforeSend={(event: BeforeSendEvent) => {
        const next = redact(event, rootDomain);
        return next;
      }}
    />
  );
}
