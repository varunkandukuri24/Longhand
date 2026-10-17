export const WRITING_FONTS = [
  "literata",
  "newsreader",
  "instrument-sans",
  "dm-mono",
] as const;

export type WritingFont = (typeof WRITING_FONTS)[number];

export const WRITING_SIZES = [18, 20, 22, 24] as const;

export type WritingSize = (typeof WRITING_SIZES)[number];

export const DEFAULT_WRITING_FONT: WritingFont = "literata";
export const DEFAULT_WRITING_SIZE: WritingSize = 20;

export const WRITING_FONT_LABEL: Record<WritingFont, string> = {
  literata: "Literata",
  newsreader: "Newsreader",
  "instrument-sans": "Instrument Sans",
  "dm-mono": "DM Mono",
};

export const WRITING_SIZE_LABEL: Record<WritingSize, string> = {
  18: "Small",
  20: "Medium",
  22: "Large",
  24: "Extra large",
};

export function parseWritingFont(value: unknown): WritingFont {
  if (
    value === "literata" ||
    value === "newsreader" ||
    value === "instrument-sans" ||
    value === "dm-mono"
  ) {
    return value;
  }
  return DEFAULT_WRITING_FONT;
}

export function parseWritingSize(value: unknown): WritingSize {
  if (value === 18 || value === 20 || value === 22 || value === 24) {
    return value;
  }
  if (typeof value === "string") {
    const n = Number(value);
    if (n === 18 || n === 20 || n === 22 || n === 24) {
      return n;
    }
  }
  return DEFAULT_WRITING_SIZE;
}

/** On phones, writing size drops one step (DESIGN.md). */
export function phoneWritingSize(size: WritingSize): WritingSize {
  const index = WRITING_SIZES.indexOf(size);
  return WRITING_SIZES[Math.max(0, index - 1)] ?? 18;
}

export function writingFontCssVar(font: WritingFont): string {
  switch (font) {
    case "newsreader":
      return "var(--font-newsreader), serif";
    case "instrument-sans":
      return "var(--font-instrument-sans), sans-serif";
    case "dm-mono":
      return "var(--font-dm-mono), monospace";
    case "literata":
    default:
      return "var(--font-literata), serif";
  }
}
