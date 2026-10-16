/**
 * Dashboard list title for a piece: writer's title, else first-line preview.
 */

function firstLinePreview(text: string, max = 60): string {
  const line = text.split(/\r?\n/).find((l) => l.trim())?.trim() ?? "";
  if (!line) return "";
  const collapsed = line.replace(/\s+/g, " ");
  return collapsed.length <= max ? collapsed : `${collapsed.slice(0, max)}…`;
}

export type DashboardDisplayTitle = {
  label: string;
  /** True when using a preview / Untitled (render in label color). */
  muted: boolean;
};

export function dashboardDisplayTitle(input: {
  title: string;
  bodyText: string;
}): DashboardDisplayTitle {
  const title = input.title.trim();
  const preview = firstLinePreview(input.bodyText);

  if (title) return { label: title, muted: false };
  if (preview) return { label: preview, muted: true };
  return { label: "Untitled", muted: true };
}
