/**
 * Time-of-day greeting for a blank piece's title placeholder (DESIGN.md).
 * Uses the reader's local clock.
 */

export type GreetingPeriod = "morning" | "afternoon" | "evening";

/** First word of the display name, or "there" if empty. */
export function firstNameFromDisplayName(displayName: string): string {
  const first = displayName.trim().split(/\s+/)[0] ?? "";
  return first || "there";
}

/**
 * Morning 5:00–11:59, afternoon 12:00–16:59, evening otherwise.
 * `hour` is 0–23 in local time.
 */
export function greetingPeriod(hour: number): GreetingPeriod {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

export function greetingTitlePlaceholder(
  displayName: string,
  now: Date = new Date(),
): string {
  const period = greetingPeriod(now.getHours());
  const first = firstNameFromDisplayName(displayName);
  return `Good ${period}, ${first}.`;
}

export const GREETING_BODY_PLACEHOLDER = "What has been on your mind?";
