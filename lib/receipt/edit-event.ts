import type { EditEvent } from "./types";

/** Shared client/server guard: accepts insert, delete, paste, and link+url. */
export function isEditEvent(value: unknown): value is EditEvent {
  if (!value || typeof value !== "object") return false;
  const e = value as Record<string, unknown>;
  if (
    typeof e.t !== "number" ||
    typeof e.pos !== "number" ||
    typeof e.len !== "number" ||
    typeof e.text !== "string"
  ) {
    return false;
  }
  if (e.type === "insert" || e.type === "delete" || e.type === "paste") {
    return true;
  }
  if (e.type === "link") {
    return typeof e.url === "string" && e.url.length > 0;
  }
  return false;
}
