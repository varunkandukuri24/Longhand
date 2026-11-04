/** Placeholder text for a blank piece. Never part of the event log. */

export const GUEST_PLACEHOLDER = "Write something";
export const WRITER_PLACEHOLDER = "What's on your mind?";

export function blankPlaceholder(mode: "guest" | "writer"): string {
  return mode === "guest" ? GUEST_PLACEHOLDER : WRITER_PLACEHOLDER;
}
