import type { SyncStatus } from "./types";

/**
 * Bottom-bar save word from the latest sync status.
 * Empty until this piece has had a batch accepted by the server.
 */
export function saveLabelFor(status: SyncStatus | null | undefined): string {
  if (status?.refused) return "not saved";
  if (status && status.queuedCount > 0) return "saving";
  if (status && status.lastAckSeq !== null) return "saved";
  return "";
}
