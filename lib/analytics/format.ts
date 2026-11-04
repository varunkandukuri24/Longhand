import { formatDuration } from "@/lib/receipt/format";

export function formatStatsCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function formatStatsDuration(ms: number): string {
  return formatDuration(ms);
}

export function formatFunnelPct(pct: number | null): string {
  if (pct === null) return "";
  return `${pct}%`;
}
