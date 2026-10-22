/**
 * Time-of-day greeting for a blank piece's placeholder (DESIGN.md).
 * Uses the reader's local clock. Never part of the event log.
 */

export type GreetingPeriod = "morning" | "afternoon" | "evening";

export const GUEST_PLACEHOLDER = "Write something";

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

export function writerPlaceholder(
  displayName: string,
  now: Date = new Date(),
): string {
  const period = greetingPeriod(now.getHours());
  const first = firstNameFromDisplayName(displayName);
  return `Good ${period}, ${first}. What has been on your mind?`;
}

export function blankPlaceholder(
  mode: "guest" | "writer",
  displayName: string,
  now: Date = new Date(),
): string {
  if (mode === "guest") return GUEST_PLACEHOLDER;
  return writerPlaceholder(displayName, now);
}
