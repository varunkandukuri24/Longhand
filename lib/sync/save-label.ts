import type { SyncStatus } from "./types";

/** Bottom-bar save word from the latest sync status. */
export function saveLabelFor(status: SyncStatus | null | undefined): string {
  if (status?.refused) return "not saved";
  if (status && status.queuedCount > 0) return "saving";
  return "saved";
}
