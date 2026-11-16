/** Placeholder text for a blank piece. Never part of the event log. */

export const GUEST_PLACEHOLDER = "Write something";
export const GUEST_INTRO_PLACEHOLDER = "Start typing. No account needed.";
export const WRITER_PLACEHOLDER = "What's on your mind?";

export function blankPlaceholder(mode: "guest" | "writer"): string {
  return mode === "guest" ? GUEST_PLACEHOLDER : WRITER_PLACEHOLDER;
}
