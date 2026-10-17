"use client";

import type { TextLink } from "@/lib/receipt/types";
import type { CSSProperties, ReactNode } from "react";

type WritingMirrorProps = {
  text: string;
  links: readonly TextLink[];
  /** When set, a zero-width probe is rendered at this index for caret measurement. */
  caretIndex?: number | null;
  style?: CSSProperties;
  className?: string;
};

type Segment = { start: number; end: number; link: boolean };

function segmentsFor(
  text: string,
  links: readonly TextLink[],
): Segment[] {
  const ordered = links
    .slice()
    .filter((l) => l.start >= 0 && l.end <= text.length && l.end > l.start)
    .sort((a, b) => a.start - b.start);
  const segs: Segment[] = [];
  let cursor = 0;
  for (const link of ordered) {
    if (link.start < cursor) continue;
    if (link.start > cursor) {
      segs.push({ start: cursor, end: link.start, link: false });
    }
    segs.push({ start: link.start, end: link.end, link: true });
    cursor = link.end;
  }
  if (cursor < text.length) {
    segs.push({ start: cursor, end: text.length, link: false });
  }
  return segs;
}

/**
 * Behind-the-textarea mirror: transparent text with underlined link labels.
 * Must share font, size, line-height, padding, width and wrapping with the textarea.
 */
export function WritingMirror({
  text,
  links,
  caretIndex = null,
  style,
  className = "",
}: WritingMirrorProps) {
  const probeAt =
    caretIndex === null || caretIndex === undefined
      ? null
      : Math.max(0, Math.min(caretIndex, text.length));

  const nodes: ReactNode[] = [];
  let probePlaced = false;

  const pushProbe = () => {
    if (probePlaced || probeAt === null) return;
    nodes.push(
      <span key={`probe-${probeAt}`} data-caret-probe>
        {"\u200b"}
      </span>,
    );
    probePlaced = true;
  };

  for (const seg of segmentsFor(text, links)) {
    const cls = seg.link ? "writing-mirror-link" : undefined;
    if (probeAt !== null && probeAt >= seg.start && probeAt <= seg.end) {
      if (probeAt > seg.start) {
        nodes.push(
          <span key={`t-${seg.start}`} className={cls}>
            {text.slice(seg.start, probeAt)}
          </span>,
        );
      }
      pushProbe();
      if (probeAt < seg.end) {
        nodes.push(
          <span key={`t-${probeAt}`} className={cls}>
            {text.slice(probeAt, seg.end)}
          </span>,
        );
      }
    } else {
      nodes.push(
        <span key={`t-${seg.start}`} className={cls}>
          {text.slice(seg.start, seg.end)}
        </span>,
      );
    }
  }

  if (probeAt !== null && !probePlaced) {
    pushProbe();
  }

  if (text.endsWith("\n")) {
    nodes.push(<span key="pad">{"\u200b"}</span>);
  }

  return (
    <div
      aria-hidden
      className={["writing-mirror", className].filter(Boolean).join(" ")}
      style={style}
      data-writing-mirror
    >
      {nodes}
    </div>
  );
}
