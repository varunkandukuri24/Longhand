/** Allowlisted first-party analytics event names and their props. */

export const ANALYTICS_EVENT_NAMES = [
  "guest_started",
  "guest_nudge_shown",
  "signin_opened",
  "signed_in",
  "guest_claimed",
  "limit_hit",
  "publish_opened",
  "published",
  "receipt_opened",
  "example_clicked",
  "write_on_longhand_clicked",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

/** Events the browser may POST to /api/events. */
export const CLIENT_ANALYTICS_EVENT_NAMES = [
  "guest_nudge_shown",
  "signin_opened",
  "limit_hit",
  "publish_opened",
  "receipt_opened",
  "example_clicked",
  "write_on_longhand_clicked",
] as const satisfies readonly AnalyticsEventName[];

export type ClientAnalyticsEventName =
  (typeof CLIENT_ANALYTICS_EVENT_NAMES)[number];

export const SIGNIN_REASONS = [
  "empty",
  "keep",
  "publish",
  "limit",
  "create_limit",
] as const;

export type SignInReasonProp = (typeof SIGNIN_REASONS)[number];

export const LIMIT_KINDS = ["words", "create"] as const;
export type LimitKindProp = (typeof LIMIT_KINDS)[number];

export const SIGN_IN_METHODS = ["google", "email"] as const;
export type SignInMethodProp = (typeof SIGN_IN_METHODS)[number];

export const PIECE_VISIBILITIES = ["public", "private"] as const;
export type PieceVisibilityProp = (typeof PIECE_VISIBILITIES)[number];

export const SIGNATURE_TIERS = ["hand", "most", "gathered", "shaped"] as const;
export type SignatureTierProp = (typeof SIGNATURE_TIERS)[number];

export const WORD_BUCKETS = [
  "under 100",
  "100–300",
  "300–1000",
  "over 1000",
] as const;
export type WordBucketProp = (typeof WORD_BUCKETS)[number];

export type AnalyticsPropValue = string | number | boolean;

export type AnalyticsEventProps = {
  guest_started: Record<string, never>;
  guest_nudge_shown: Record<string, never>;
  signin_opened: { reason: SignInReasonProp };
  signed_in: { method: SignInMethodProp; new_account: boolean };
  guest_claimed: Record<string, never>;
  limit_hit: { kind: LimitKindProp };
  publish_opened: Record<string, never>;
  published: {
    visibility: PieceVisibilityProp;
    tier: SignatureTierProp;
    words: WordBucketProp;
  };
  receipt_opened: Record<string, never>;
  example_clicked: Record<string, never>;
  write_on_longhand_clicked: Record<string, never>;
};

const ALLOWED_KEYS: {
  [K in AnalyticsEventName]: ReadonlySet<keyof AnalyticsEventProps[K] & string>;
} = {
  guest_started: new Set(),
  guest_nudge_shown: new Set(),
  signin_opened: new Set(["reason"]),
  signed_in: new Set(["method", "new_account"]),
  guest_claimed: new Set(),
  limit_hit: new Set(["kind"]),
  publish_opened: new Set(),
  published: new Set(["visibility", "tier", "words"]),
  receipt_opened: new Set(),
  example_clicked: new Set(),
  write_on_longhand_clicked: new Set(),
};

const STRING_MAX = 32;

export function isAnalyticsEventName(name: string): name is AnalyticsEventName {
  return (ANALYTICS_EVENT_NAMES as readonly string[]).includes(name);
}

export function isClientAnalyticsEventName(
  name: string,
): name is ClientAnalyticsEventName {
  return (CLIENT_ANALYTICS_EVENT_NAMES as readonly string[]).includes(name);
}

export function sanitizeProps(
  name: AnalyticsEventName,
  props: Record<string, unknown> | undefined,
): Record<string, AnalyticsPropValue> | null {
  const allowed = ALLOWED_KEYS[name];
  const input = props ?? {};
  const keys = Object.keys(input);

  for (const key of keys) {
    if (!allowed.has(key as never)) {
      return null;
    }
  }

  const out: Record<string, AnalyticsPropValue> = {};

  for (const key of allowed) {
    if (!(key in input)) {
      // Required keys for events that declare props must be present.
      if (allowed.size > 0) {
        return null;
      }
      continue;
    }
    const value = input[key];
    if (typeof value === "boolean" || typeof value === "number") {
      if (typeof value === "number" && !Number.isFinite(value)) {
        return null;
      }
      out[key] = value;
      continue;
    }
    if (typeof value === "string") {
      if (value.length > STRING_MAX) {
        return null;
      }
      if (!isAllowedStringProp(name, key, value)) {
        return null;
      }
      out[key] = value;
      continue;
    }
    return null;
  }

  // Events with required props: every allowed key must be present.
  if (allowed.size > 0 && Object.keys(out).length !== allowed.size) {
    return null;
  }

  return out;
}

function isAllowedStringProp(
  name: AnalyticsEventName,
  key: string,
  value: string,
): boolean {
  if (name === "signin_opened" && key === "reason") {
    return (SIGNIN_REASONS as readonly string[]).includes(value);
  }
  if (name === "signed_in" && key === "method") {
    return (SIGN_IN_METHODS as readonly string[]).includes(value);
  }
  if (name === "limit_hit" && key === "kind") {
    return (LIMIT_KINDS as readonly string[]).includes(value);
  }
  if (name === "published" && key === "visibility") {
    return (PIECE_VISIBILITIES as readonly string[]).includes(value);
  }
  if (name === "published" && key === "tier") {
    return (SIGNATURE_TIERS as readonly string[]).includes(value);
  }
  if (name === "published" && key === "words") {
    return (WORD_BUCKETS as readonly string[]).includes(value);
  }
  return false;
}

export function signatureTier(typedShare: number): SignatureTierProp {
  if (typedShare >= 0.95) return "hand";
  if (typedShare >= 0.75) return "most";
  if (typedShare >= 0.4) return "gathered";
  return "shaped";
}

export function wordBucket(wordCount: number): WordBucketProp {
  if (wordCount < 100) return "under 100";
  if (wordCount <= 300) return "100–300";
  if (wordCount <= 1000) return "300–1000";
  return "over 1000";
}

export function signInMethodFromProvider(
  provider: string | undefined | null,
): SignInMethodProp {
  if (provider === "google") return "google";
  return "email";
}
