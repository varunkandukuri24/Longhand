"use client";

import type {
  ClientAnalyticsEventName,
  AnalyticsEventProps,
} from "./names";

/**
 * Fire an allowlisted client event. Fire-and-forget; never throws.
 */
export function trackClient<N extends ClientAnalyticsEventName>(
  name: N,
  props?: AnalyticsEventProps[N],
): void {
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, props: props ?? {} }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
