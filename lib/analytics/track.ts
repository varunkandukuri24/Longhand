import { db } from "@/db";
import { analyticsEvents } from "@/db/schema";
import {
  isAnalyticsEventName,
  sanitizeProps,
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from "./names";

export type TrackOptions<N extends AnalyticsEventName> = {
  userId?: string | null;
  guestId?: string | null;
  props?: AnalyticsEventProps[N];
  /** Test hook: inject created_at. */
  createdAt?: Date;
};

/**
 * Record a first-party analytics event. Never throws. Callers should not await
 * it on hot paths: `void track(...)`.
 */
export async function track<N extends AnalyticsEventName>(
  name: N,
  options: TrackOptions<N> = {},
): Promise<boolean> {
  try {
    if (!isAnalyticsEventName(name)) {
      console.error("[analytics] unknown event name", name);
      return false;
    }
    const props = sanitizeProps(
      name,
      options.props as Record<string, unknown> | undefined,
    );
    if (props === null) {
      console.error("[analytics] rejected props", name, options.props);
      return false;
    }

    await db.insert(analyticsEvents).values({
      name,
      userId: options.userId ?? null,
      guestId: options.guestId ?? null,
      props,
      ...(options.createdAt ? { createdAt: options.createdAt } : {}),
    });
    return true;
  } catch (err) {
    console.error("[analytics] track failed", name, err);
    return false;
  }
}

/** Validate without writing — used by /api/events and unit tests. */
export function validateTrackInput(
  name: unknown,
  props: unknown,
):
  | { ok: true; name: AnalyticsEventName; props: Record<string, string | number | boolean> }
  | { ok: false } {
  if (typeof name !== "string" || !isAnalyticsEventName(name)) {
    return { ok: false };
  }
  if (
    props !== undefined &&
    (props === null || typeof props !== "object" || Array.isArray(props))
  ) {
    return { ok: false };
  }
  const sanitized = sanitizeProps(
    name,
    props as Record<string, unknown> | undefined,
  );
  if (sanitized === null) {
    return { ok: false };
  }
  return { ok: true, name, props: sanitized };
}
