/**
 * Dashboard list title for a piece. Response pieces never show the source
 * article title — only the writer's title or the first line of their text.
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
  mode: "freewrite" | "response";
  title: string;
  sourceTitle: string | null | undefined;
  bodyText: string;
}): DashboardDisplayTitle {
  const title = input.title.trim();
  const source = (input.sourceTitle ?? "").trim();
  const preview = firstLinePreview(input.bodyText);

  if (input.mode === "response") {
    if (title && title !== source) {
      return { label: title, muted: false };
    }
    if (preview) return { label: preview, muted: true };
    return { label: "Untitled", muted: true };
  }

  if (title) return { label: title, muted: false };
  if (preview) return { label: preview, muted: true };
  return { label: "Untitled", muted: true };
}
