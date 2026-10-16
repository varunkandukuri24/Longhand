"use client";

import type { TextLink } from "@/lib/receipt/types";
import type { CSSProperties, ReactNode } from "react";

type WritingMirrorProps = {
  text: string;
  links: readonly TextLink[];
  scrollTop: number;
  style?: CSSProperties;
  className?: string;
};

/**
 * Behind-the-textarea mirror: transparent text with underlined link labels.
 * Must share font, size, line-height, padding, width and wrapping with the textarea.
 */
export function WritingMirror({
  text,
  links,
  scrollTop,
  style,
  className = "",
}: WritingMirrorProps) {
  const ordered = links.slice().sort((a, b) => a.start - b.start);
  const nodes: ReactNode[] = [];
  let cursor = 0;
  for (const link of ordered) {
    if (link.start < cursor || link.end > text.length) continue;
    if (link.start > cursor) {
      nodes.push(
        <span key={`t-${cursor}`}>{text.slice(cursor, link.start)}</span>,
      );
    }
    nodes.push(
      <span key={`l-${link.start}`} className="writing-mirror-link">
        {text.slice(link.start, link.end)}
      </span>,
    );
    cursor = link.end;
  }
  if (cursor < text.length) {
    nodes.push(<span key={`t-${cursor}`}>{text.slice(cursor)}</span>);
  }
  if (text.endsWith("\n")) {
    nodes.push(<span key="pad">{"\u200b"}</span>);
  }

  return (
    <div
      aria-hidden
      className={["writing-mirror", className].filter(Boolean).join(" ")}
      style={{ ...style, transform: `translateY(${-scrollTop}px)` }}
    >
      {nodes}
    </div>
  );
}
