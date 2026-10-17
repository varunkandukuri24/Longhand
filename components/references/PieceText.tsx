import {
  displayLabelFor,
  displayLinksFor,
} from "@/lib/references/display-links";
import type { TextLink } from "@/lib/receipt/types";
import type { ReactNode } from "react";

function renderInline(text: string, links: readonly TextLink[]): ReactNode {
  if (links.length === 0) {
    return text;
  }
  const ordered = links.slice().sort((a, b) => a.start - b.start);
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const link of ordered) {
    if (link.start < cursor || link.end > text.length || link.start >= link.end) {
      continue;
    }
    if (link.start > cursor) {
      parts.push(text.slice(cursor, link.start));
    }
    parts.push(
      <a
        key={`${link.start}-${link.url}`}
        href={link.url}
        target="_blank"
        rel="noopener nofollow ugc"
        className="text-ink underline decoration-[#BDB6AA] underline-offset-4"
      >
        {displayLabelFor(text, link)}
      </a>,
    );
    cursor = link.end;
  }
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }
  return parts;
}

function linksInRange(
  links: readonly TextLink[],
  start: number,
  end: number,
): TextLink[] {
  return links
    .filter((l) => l.end > start && l.start < end)
    .map((l) => ({
      start: Math.max(0, l.start - start),
      end: Math.min(end - start, l.end - start),
      url: l.url,
    }))
    .filter((l) => l.end > l.start);
}

function splitParagraphs(
  text: string,
): Array<{ text: string; start: number }> {
  const paragraphs: Array<{ text: string; start: number }> = [];
  const re = /\n\n+/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    paragraphs.push({ text: text.slice(last, match.index), start: last });
    last = match.index + match[0].length;
  }
  paragraphs.push({ text: text.slice(last), start: last });
  return paragraphs;
}

/** Published piece body: hostname links (stored + remaining raw URLs) and quotes. */
export function PieceText({
  text,
  links = [],
}: {
  text: string;
  links?: readonly TextLink[] | null;
}) {
  const resolved = displayLinksFor(text, links);
  const paragraphs = splitParagraphs(text);
  return (
    <div className="mt-6 flex flex-col gap-[22px]">
      {paragraphs.map((para, bi) => {
        const lines = para.text.split("\n");
        let lineStart = para.start;
        return (
          <div key={bi} className="flex flex-col">
            {lines.map((line, li) => {
              const lineLinks = linksInRange(
                resolved,
                lineStart,
                lineStart + line.length,
              );
              const node = line.startsWith("> ") ? (
                <p
                  key={li}
                  className="pl-7 font-writing text-[20px] leading-[1.7] text-[#3A352E] italic"
                >
                  {renderInline(
                    line.slice(2),
                    lineLinks
                      .map((l) => ({
                        start: Math.max(0, l.start - 2),
                        end: Math.max(0, l.end - 2),
                        url: l.url,
                      }))
                      .filter((l) => l.end > l.start),
                  )}
                </p>
              ) : (
                <p
                  key={li}
                  className="font-writing text-[20px] leading-[1.7] text-ink"
                >
                  {renderInline(line, lineLinks)}
                </p>
              );
              lineStart += line.length + 1;
              return node;
            })}
          </div>
        );
      })}
    </div>
  );
}
