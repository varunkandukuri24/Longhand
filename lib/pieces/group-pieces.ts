import type { PanePiece } from "@/app/actions/list-pieces";

export type PieceGroupKey = "today" | "thisWeek" | "earlier";

export type PieceGroup = {
  key: PieceGroupKey;
  label: string;
  pieces: PanePiece[];
};

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Group pieces by last edit in the reader's local time. */
export function groupPiecesByRecency(
  pieces: PanePiece[],
  now: Date = new Date(),
): PieceGroup[] {
  const todayStart = startOfLocalDay(now);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 6);

  const today: PanePiece[] = [];
  const thisWeek: PanePiece[] = [];
  const earlier: PanePiece[] = [];

  for (const piece of pieces) {
    const at = new Date(piece.updatedAt);
    if (at >= todayStart) {
      today.push(piece);
    } else if (at >= weekStart) {
      thisWeek.push(piece);
    } else {
      earlier.push(piece);
    }
  }

  const groups: PieceGroup[] = [];
  if (today.length) {
    groups.push({ key: "today", label: "TODAY", pieces: today });
  }
  if (thisWeek.length) {
    groups.push({ key: "thisWeek", label: "THIS WEEK", pieces: thisWeek });
  }
  if (earlier.length) {
    groups.push({ key: "earlier", label: "EARLIER", pieces: earlier });
  }
  return groups;
}

export function pieceMetaLine(piece: PanePiece): string {
  const status =
    piece.status === "published"
      ? piece.visibility === "private"
        ? "private"
        : "public"
      : "draft";
  const words =
    piece.words === 1 ? "1 word" : `${piece.words} words`;
  return `${status} · ${words}`;
}
