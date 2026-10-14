import { createHash } from "node:crypto";

/** SHA-256 hex digest via node:crypto (server). */
export function sha256HexNode(utf8: string): string {
  return createHash("sha256").update(utf8, "utf8").digest("hex");
}
